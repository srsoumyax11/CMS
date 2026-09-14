from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
import traceback

from app.core.config import settings
from app.api.routes import health, auth, users, metadata

app = FastAPI(title="Campus Management System API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["Metadata"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])

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
