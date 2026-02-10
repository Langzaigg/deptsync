import uuid
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from .database import engine, Base, SessionLocal
from .models import *
from .routers import auth, users, projects, tasks, events, inspirations, reports, llm, files
from .utils.auth import get_password_hash
from .models.user import User as UserModel, UserRole

app = FastAPI(
    title="DeptSync API",
    description="部门项目协同管理平台后端 API",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(events.router)
app.include_router(inspirations.router)
app.include_router(reports.router)
app.include_router(llm.router)
app.include_router(files.router)


@app.on_event("startup")
async def startup():
    """Create tables, seed admin user, and init MinIO on startup."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Seed admin user if not exists
    db = SessionLocal()
    try:
        admin = db.query(UserModel).filter(UserModel.job_number == "admin").first()
        if not admin:
            admin = UserModel(
                id=str(uuid.uuid4()),
                job_number="admin",
                name="管理员",
                password_hash=get_password_hash("admin"),
                username="管理员(admin)",
                role=UserRole.ADMIN,
                skills=["系统管理"]
            )
            db.add(admin)
            db.commit()
            print("✓ Admin user created: admin/admin")
    finally:
        db.close()
    
    # Initialize MinIO bucket
    try:
        from .services.minio_service import ensure_bucket
        ensure_bucket()
    except Exception as e:
        logger.warning(f"MinIO initialization failed (file uploads will not work): {e}")


@app.get("/")
async def root():
    return {"message": "DeptSync API is running"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


# 全局异常处理器 - 请求验证错误
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求参数验证错误"""
    errors = []
    for error in exc.errors():
        error_msg = {
            "loc": error.get("loc", []),
            "msg": error.get("msg", ""),
            "type": error.get("type", "")
        }
        errors.append(error_msg)
    
    logger.error(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "请求参数验证失败",
            "detail": errors,
            "path": str(request.url)
        }
    )


# 全局异常处理器 - HTTP异常
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理HTTP异常"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP {exc.status_code}",
            "detail": exc.detail,
            "path": str(request.url)
        }
    )


# 全局异常处理器 - 捕获所有其他异常
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理所有未捕获的异常"""
    error_trace = traceback.format_exc()
    logger.error(f"Unhandled exception: {str(exc)}\n{error_trace}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "服务器内部错误",
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url),
            "traceback": error_trace if "debug" in str(request.url) else None
        }
    )
