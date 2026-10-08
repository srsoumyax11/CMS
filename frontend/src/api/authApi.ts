import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  UserResponse,
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  NameUpdateRequest,
  PasswordChangeRequest,
  StudentProfileCreateRequest,
  UserPreferencesUpdateRequest,
  LoginResponseData
} from '@/types/api';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<APIResponse<LoginResponseData>>(API_ROUTES.LOGIN, data),

  refresh: (data: RefreshTokenRequest) =>
    client.post<APIResponse<RefreshTokenResponse>>(API_ROUTES.REFRESH, data),

  me: () => client.get<APIResponse<UserResponse>>(API_ROUTES.ME),

  checkEmail: (email: string) => 
    client.get<APIResponse<boolean>>(API_ROUTES.CHECK_EMAIL, { params: { email } }),

  register: (data: RegisterRequest) =>
    client.post<APIResponse<TokenResponse>>(API_ROUTES.REGISTER, data),

  openSignup: (data: { email: string; password: string; name: string }) =>
    client.post<APIResponse<{ session_token: string; email: string; message: string }>>('/api/auth/open-signup', data),

  verifySignupOtp: (data: { email: string; otp: string; session_token: string; name: string; password: string }) =>
    client.post<APIResponse<TokenResponse>>('/api/auth/verify-signup-otp', data),

  verify2FA: (data: { session_token: string; otp: string }) =>
    client.post<APIResponse<TokenResponse>>('/api/auth/login/verify-2fa', data),

  forgotPassword: (data: { email: string }) =>
    client.post<APIResponse<{ message: string }>>('/api/auth/forgot-password', data),

  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    client.post<APIResponse<{ message: string }>>('/api/auth/reset-password', data),

  createStudentProfile: (data: StudentProfileCreateRequest) =>
    client.post<APIResponse<{ message: string }>>(API_ROUTES.CREATE_STUDENT_PROFILE, data),

  updateStudentProfile: (data: StudentProfileCreateRequest) =>
    client.put<APIResponse<{ message: string }>>(API_ROUTES.CREATE_STUDENT_PROFILE, data),

  getStudentProfile: () =>
    client.get<APIResponse<{
      department_id: string; course_id: string; branch_id: string; year: number; hostel: string | null 
    } | null>>(API_ROUTES.CREATE_STUDENT_PROFILE),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return client.post<APIResponse<{ photo_url: string }>>(
      API_ROUTES.UPLOAD_PHOTO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  updateName: (data: NameUpdateRequest) =>
    client.patch<APIResponse<{ name: string }>>(API_ROUTES.UPDATE_NAME, data),

  changePassword: (data: PasswordChangeRequest) =>
    client.post<APIResponse<{ message: string }>>(API_ROUTES.CHANGE_PASSWORD, data),

  updatePreferences: (data: UserPreferencesUpdateRequest) =>
    client.patch<APIResponse<{ email_notifications: boolean; in_app_alerts: boolean }>>(API_ROUTES.UPDATE_PREFERENCES, data),

  requestEmailUpdate: (data: { new_email: string }) =>
    client.post<APIResponse<{ message: string, session_token: string }>>(API_ROUTES.REQUEST_EMAIL_UPDATE, data),

  verifyEmailUpdate: (data: { otp: string, session_token: string }) =>
    client.post<APIResponse<{ message: string }>>(API_ROUTES.VERIFY_EMAIL_UPDATE, data),

  enable2FARequest: () =>
    client.post<APIResponse<{ message: string, session_token: string }>>('/api/users/me/2fa/enable-request', {}),

  enable2FAVerify: (data: { session_token: string; otp: string }) =>
    client.post<APIResponse<{ message: string }>>('/api/users/me/2fa/enable-verify', data),

  disable2FA: () =>
    client.post<APIResponse<{ message: string }>>('/api/users/me/2fa/disable', {}),
};
