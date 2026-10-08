from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import get_current_user, RateLimiter, get_uow
from app.core.uow import UnitOfWork
from app.core.security import verify_password
from app.models.user import User, UserType
from app.schemas.auth import (
    RegisterRequest, 
    LoginRequest, 
    TokenResponse, 
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserResponse,
    EmailVerifyOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    OpenSignUpRequest,
    VerifySignUpOTPRequest
)

from app.schemas.common import APIResponse
from app.services.auth_service import AuthService

router = APIRouter()

def get_auth_service(uow: UnitOfWork = Depends(get_uow)) -> AuthService:
    return AuthService(uow)

@router.get(
    "/check-email",
    summary="Check Email Availability",
    description="Checks if an email is already registered.",
    response_model=APIResponse[bool]
)
async def check_email(email: str, service: AuthService = Depends(get_auth_service)):
    is_available = await service.check_email(email)
    return APIResponse(success=True, data=is_available, error=None)

@router.post(
    "/open-signup",
    summary="Open Registration Step 1: Send Verification OTP",
    description="Validates email/password and sends a 6-digit verification code to the email address.",
    response_model=APIResponse[dict]
)
async def open_signup(
    data: OpenSignUpRequest,
    background_tasks: BackgroundTasks,
    service: AuthService = Depends(get_auth_service)
):
    try:
        session_token = await service.request_signup_otp(data.email, data.password, data.name, background_tasks)
        return APIResponse(
            success=True,
            data={"session_token": session_token, "email": data.email, "message": "Verification OTP sent to email"},
            error=None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/verify-signup-otp",
    summary="Open Registration Step 2: Verify OTP & Create Account",
    description="Verifies the OTP code, creates an active base user account, and returns JWT tokens for automatic login.",
    response_model=APIResponse[TokenResponse]
)
async def verify_signup_otp(
    data: VerifySignUpOTPRequest,
    background_tasks: BackgroundTasks,
    service: AuthService = Depends(get_auth_service)
):
    try:
        new_user, access_token, refresh_token = await service.verify_signup_otp(
            data.email, data.otp, data.session_token, data.password, data.name, background_tasks
        )
        return APIResponse(
            success=True,
            data=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user_type=new_user.user_type,
                account_status=new_user.account_status,
                academic_status=None,
                employment_status=None
            ),
            error=None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/register", 
    summary="Register Student", 
    description="Registers a new student user. Assigns the default 'Student' role, sets status to 'pending', and logs them in.", 
    response_model=APIResponse[TokenResponse]
)
async def register(
    data: RegisterRequest, 
    background_tasks: BackgroundTasks, 
    service: AuthService = Depends(get_auth_service)
):
    try:
        new_user, access_token, refresh_token = await service.register_student(data, background_tasks)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return APIResponse(
        success=True, 
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_type=new_user.user_type,
            account_status=new_user.account_status,
            academic_status=None,
            employment_status=None
        ), 
        error=None
    )



@router.post(
    "/token", 
    summary="OAuth2 Token Login", 
    description="Standard OAuth2 form data login endpoint for Swagger UI testing.",
    dependencies=[Depends(RateLimiter(times=5, minutes=1))]
)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    service: AuthService = Depends(get_auth_service)
):
    user = await service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    from app.core.security import create_access_token
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/login", 
    summary="User Login", 
    description="Authenticates a user with email and password, returning access and refresh JWTs.",
    response_model=APIResponse[dict],
    dependencies=[Depends(RateLimiter(times=100, minutes=1))]
)
async def login(
    data: LoginRequest, 
    background_tasks: BackgroundTasks,
    service: AuthService = Depends(get_auth_service)
):
    user = await service.authenticate(data.email, data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # User is authenticated.
    if user.is_2fa_enabled:
        session_token = await service.generate_2fa_otp(user, background_tasks)
        return APIResponse(
            success=True, 
            data={"requires_2fa": True, "session_token": session_token, "email": user.email},
            error=None
        )

    academic_status = None
    employment_status = None
    if user.user_type == UserType.student and user.student_profile:
        academic_status = user.student_profile.academic_status.value
    elif user.user_type == UserType.faculty and user.faculty_profile:
        employment_status = user.faculty_profile.employment_status.value

    from app.core.security import create_access_token, create_refresh_token
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return APIResponse(
        success=True, 
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_type": user.user_type,
            "account_status": user.account_status,
            "academic_status": academic_status,
            "employment_status": employment_status
        }, 
        error=None
    )


@router.post(
    "/login/verify-2fa",
    summary="Verify 2FA Login",
    description="Exchanges the 2FA session token and OTP for access tokens.",
    response_model=APIResponse[dict],
    dependencies=[Depends(RateLimiter(times=5, minutes=1))]
)
async def verify_2fa_login(
    data: EmailVerifyOTPRequest,
    service: AuthService = Depends(get_auth_service)
):
    try:
        from app.core.config import settings
        import jwt
        payload = jwt.decode(data.session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="OTP session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid session token.")
        
    user_id = payload.get("sub")
    otp_hash = payload.get("otp_hash")
    
    if not user_id or not otp_hash or not verify_password(data.otp, str(otp_hash)):
        raise HTTPException(status_code=400, detail="Incorrect 2FA code.")
        
    # We can just fetch user with profiles using repo inside service
    from uuid import UUID
    user = await service.repo.get_by_id_with_profiles(UUID(user_id))
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    academic_status = None
    employment_status = None
    if user.user_type == UserType.student and user.student_profile:
        academic_status = user.student_profile.academic_status.value
    elif user.user_type == UserType.faculty and user.faculty_profile:
        employment_status = user.faculty_profile.employment_status.value

    from app.core.security import create_access_token, create_refresh_token
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return APIResponse(
        success=True, 
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_type": user.user_type,
            "account_status": user.account_status,
            "academic_status": academic_status,
            "employment_status": employment_status
        }, 
        error=None
    )


@router.post(
    "/refresh", 
    summary="Refresh Token", 
    description="Exchanges a valid refresh token for a new access token.",
    response_model=APIResponse[RefreshTokenResponse]
)
async def refresh_token(
    data: RefreshTokenRequest, 
    service: AuthService = Depends(get_auth_service)
):
    try:
        new_access_token = await service.refresh_token(data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return APIResponse(
        success=True,
        data=RefreshTokenResponse(access_token=new_access_token), 
        error=None
    )


@router.post(
    "/logout",
    summary="Logout User",
    description="Revokes the provided refresh token.",
    response_model=APIResponse[None]
)
async def logout(
    data: RefreshTokenRequest,
    service: AuthService = Depends(get_auth_service)
):
    await service.logout(data.refresh_token)
    return APIResponse(success=True, message="Successfully logged out")

@router.post(
    "/forgot-password",
    summary="Forgot Password",
    description="Sends an OTP to the user's email if the account exists.",
    response_model=APIResponse[None]
)
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    service: AuthService = Depends(get_auth_service)
):
    await service.forgot_password(data.email, background_tasks)
    return APIResponse(success=True, message="If an account exists, an OTP has been sent.")

@router.post(
    "/reset-password",
    summary="Reset Password",
    description="Verifies the OTP and resets the user's password.",
    response_model=APIResponse[None]
)
async def reset_password(
    data: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service)
):
    try:
        await service.reset_password(data.email, data.otp, data.new_password)
        return APIResponse(success=True, message="Password reset successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get(
    "/me", 
    summary="Get Current User", 
    description="Fetches the profile and metadata for the currently authenticated user based on the JWT.",
    response_model=APIResponse[UserResponse]
)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current logged in user details. Doesn't require any RBAC permissions.
    Allows users with "pending" profiles to check their status.
    """
    rbac_roles = [current_user.role.name] if current_user.role else []
    permissions = list({
        f"{perm.asset.name}:{perm.action.code}"
        for perm in current_user.role.permissions
    }) if current_user.role else []

    return APIResponse(
        success=True,
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            account_status=current_user.account_status,
            status_note=current_user.status_note,
            user_type=current_user.user_type,
            academic_status=current_user.student_profile.academic_status if current_user.student_profile else None,
            employment_status=current_user.faculty_profile.employment_status if current_user.faculty_profile else None,
            name=current_user.name,
            photo_url=current_user.photo_url,
            email_notifications=current_user.email_notifications,
            in_app_alerts=current_user.in_app_alerts,
            is_2fa_enabled=current_user.is_2fa_enabled,
            rbac_roles=rbac_roles,
            permissions=permissions
        ),
        error=None
    )
