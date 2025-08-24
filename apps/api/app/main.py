from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import job, linkedin, optimize, parse, resume, user
from .dependencies import shutdown_services
from .database.connections import (
    init_databases,
    close_databases,
    check_all_databases_health,
)

app = FastAPI()


@app.get("/health")
async def health_check():
    """Health check endpoint with database health."""
    database_health = await check_all_databases_health()

    return {
        "status": "healthy" if database_health["status"] == "up" else "degraded",
        "service": "atspro-api",
        "databases": database_health["databases"],
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
