from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError
import traceback

from app.core.config import settings
from app.api.routes import health, auth, users, metadata, admin, roles, complaints, admin_complaints, notices, outpasses, admin_outpasses

tags_metadata = [
    {
        "name": "Auth",
        "description": "Authentication endpoints for login, registration, and token validation.",
    },
    {
        "name": "Users",
        "description": "User profile management and metadata.",
    },
    {
        "name": "Complaints (Student/Public)",
        "description": "Endpoints for students to raise and track complaints.",
    },
    {
        "name": "Complaints (Admin/Faculty)",
        "description": "Administrative endpoints for resolving and assigning complaints.",
    },
    {
        "name": "Outpasses",
        "description": "Student endpoints for requesting and tracking gate passes.",
    },
    {
        "name": "Admin Outpasses",
        "description": "Administrative endpoints for approving, rejecting, and tracking outpasses.",
    },
    {
        "name": "Notices",
        "description": "Digital notice board for targeted announcements.",
    },
    {
        "name": "Admin",
        "description": "SuperAdmin routes for managing users, faculty, and system configuration.",
    }
]

app = FastAPI(
    title="Campus Management System API",
    description="""
A robust, asynchronous REST API powering the Campus Management System (CMS).

## Security & RBAC
This API uses a strict Role-Based Access Control (RBAC) engine. 
Routes are heavily guarded by `require_permission` capabilities and explicit row-level IDOR checks.
""",
    version="1.0.0",
    contact={
        "name": "Backend Team",
        "email": "admin@cms.com",
    },
    openapi_tags=tags_metadata
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["Metadata"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles & Permissions"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints (Student/Public)"])
app.include_router(admin_complaints.router, prefix="/api/admin/complaints", tags=["Complaints (Admin/Faculty)"])
app.include_router(notices.router, prefix="/api/notices", tags=["Notices"])
app.include_router(outpasses.router, prefix="/api/outpasses", tags=["Outpasses"])
app.include_router(admin_outpasses.router, prefix="/api/admin/outpasses", tags=["Admin Outpasses"])

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_msgs = [f"{err['loc'][-1]}: {err['msg']}" for err in errors]
    return JSONResponse(
        status_code=422,
        content={"success": False, "data": None, "error": f"Validation Error: {', '.join(error_msgs)}"}
    )

@app.exception_handler(IntegrityError)
async def sqlalchemy_integrity_exception_handler(request: Request, exc: IntegrityError):
    # This handles database unique constraints and foreign key errors
    return JSONResponse(
        status_code=400,
        content={"success": False, "data": None, "error": "Database Integrity Error: Resource already exists or conflicts."}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = traceback.format_exc()
    print(error_msg)
    
    response_error = "Internal Server Error"
    if settings.ENVIRONMENT == "dev":
        response_error = f"Internal Server Error: {str(exc)}"
        
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": response_error}
    )
