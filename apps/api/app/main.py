from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .routers import job, linkedin, optimize, parse, resume, user
from .dependencies import shutdown_services
from .database.connections import (
    init_databases,
    close_databases,
    check_database_health,
)
from .logger.logger import logger

app = FastAPI()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for validation errors to log details."""
    logger.error(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    logger.error(f"Request body: {await request.body()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Custom handler for Pydantic validation errors."""
    logger.error(f"Pydantic validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint with database health."""
    database_health = await check_database_health()

    return {
        "status": "healthy" if database_health["status"] == "up" else "degraded",
        "service": "atspro-api",
        "database": database_health,
    }


origins = [
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(linkedin.router, prefix="/api")
app.include_router(job.router, prefix="/api")
app.include_router(optimize.router, prefix="/api")
app.include_router(user.router, prefix="/api")


# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    import logging

    logger = logging.getLogger(__name__)

    # Initialize database connections
    logger.info("Initializing global database connections...")
    await init_databases()
    logger.info("Global database connections initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on application shutdown."""
    # Shutdown services
    await shutdown_services()

    # Close database connections
    await close_databases()
