from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import text
from contextlib import asynccontextmanager
import traceback
import sys
import uuid
import time
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import setup_logging, get_logger, request_id_var

# Setup structured logging
setup_logging(log_level="INFO")
logger = get_logger("app")

from app.core.database import AsyncSessionLocal

from app.core.config import settings
from app.api.routes import (
    auth,
    metadata,
    users,
    admin,
    roles,
    notices,
    complaints,
    outpasses,
    timetable,
    attendance,
    mess,
    notifications,
    health,
    documents,
    infrastructure,
    audience_groups,
    finance,
    visitors,
    hostel,
    applications,
    gate_pass,
    parent_link
)





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
        "name": "Admin",
        "description": "SuperAdmin routes for managing users, faculty, and system configuration.",
    },
    {
        "name": "Complaints",
        "description": "Endpoints for resolving, assigning, raising, and tracking complaints.",
    },
    {
        "name": "Outpasses",
        "description": "Endpoints for requesting, tracking, approving, and rejecting outpasses.",
    },
    {
        "name": "Notices",
        "description": "Digital notice board for targeted announcements.",
    },
    {
        "name": "Mess",
        "description": "Endpoints for mess menu, feedback, opt-outs, and analytics.",
    },
    {
        "name": "Documents",
        "description": "Endpoints for requesting and issuing documents and certificates.",
    }
]

from app.core.cache import init_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup DB health check
    logger.info("Checking database connection...")
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            logger.info("Database connection healthy!")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        sys.exit(1)
        
    logger.info("Initializing Redis...")
    try:
        await init_redis()
        logger.info("Redis connection established!")
    except Exception as e:
        logger.warning(f"Redis connection failed (rate limiting will fail open): {e}")
        
    yield
    
    logger.info("Shutting down backend...")
    await close_redis()

app = FastAPI(
    title="BPUT Campus Management System API",
    description="""
A robust, asynchronous REST API powering the BPUT Campus Management System (BPUT CMS).

## Security & RBAC
This API uses a strict Role-Based Access Control (RBAC) engine. 
Routes are heavily guarded by `require_permission` capabilities and explicit row-level IDOR checks.
""",
    version="1.0.0",
    lifespan=lifespan,
    contact={
        "name": "Backend Team",
        "email": "admin@cms.com",
    },
    openapi_tags=tags_metadata
)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        request_id_var.set(req_id)
        
        start_time = time.time()
        
        method_emoji = "📥" if request.method == "GET" else "📤" if request.method == "POST" else "🔄"
        logger.info(f"{method_emoji} {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            ms = round(process_time * 1000, 2)
            
            status_emoji = "✅" if response.status_code < 300 else "🟡" if response.status_code < 500 else "🚨"
            logger.info(
                f"{status_emoji} {request.method} {request.url.path}",
                extra={"status_code": response.status_code, "process_time_ms": ms}
            )
            
            response.headers["X-Request-ID"] = req_id
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            ms = round(process_time * 1000, 2)
            logger.error(
                f"💥 FAILED {request.method} {request.url.path}",
                extra={"process_time_ms": ms},
                exc_info=True
            )
            raise e

app.add_middleware(RequestLoggingMiddleware)


# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["System"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["Metadata"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(applications.router, prefix="/api", tags=["Applications"])

app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles & Permissions"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(notices.router, prefix="/api/notices", tags=["Notices"])
app.include_router(outpasses.router, prefix="/api/outpasses", tags=["Outpasses"])
app.include_router(timetable.router, prefix="/api/timetable", tags=["Timetable"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(mess.router, prefix="/api/mess", tags=["Mess"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(documents.admin_router, prefix="/api/admin/documents", tags=["Documents (Admin)"])
app.include_router(infrastructure.router, prefix="/api/infrastructure", tags=["Infrastructure"])
app.include_router(audience_groups.router, prefix="/api", tags=["Audience Groups"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])
app.include_router(visitors.router, prefix="/api/visitors", tags=["Visitors"])
app.include_router(hostel.router, prefix="/api/hostel", tags=["Hostel"])
app.include_router(gate_pass.router, prefix="/api", tags=["Quick Gate Pass & Safety Matrix"])
app.include_router(parent_link.router, prefix="/api", tags=["Parent Guardian Consent & Privacy Matrix"])




from fastapi.staticfiles import StaticFiles

# Serve uploaded static files
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    logger.error("Unhandled global exception", exc_info=exc)
    
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": error_msg}
    )
