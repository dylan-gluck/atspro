from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .routers import job, linkedin, optimize, parse, resume, tasks, user, workers
from .websocket.task_updates import websocket_endpoint
from .services.notification_service import notification_service
from .workers.startup import start_workers, stop_workers, get_worker_status
from .dependencies import get_task_service, shutdown_services
from .database.connections import (
    init_databases,
    close_databases,
    check_all_databases_health,
)

app = FastAPI()


@app.get("/health")
async def health_check():
    """Health check endpoint with worker status and database health."""
    worker_status = await get_worker_status()
    database_health = await check_all_databases_health()

    # Determine overall service health
    service_healthy = (
        worker_status["manager_status"] == "running"
        and database_health["status"] == "up"
    )

    return {
        "status": "healthy" if service_healthy else "degraded",
        "service": "atspro-api",
        "workers": {
            "status": worker_status["manager_status"],
            "total": worker_status["total_workers"],
            "running": worker_status["running_workers"],
            "active_tasks": worker_status["total_active_tasks"],
        },
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
app.include_router(tasks.router, prefix="/api/tasks")
app.include_router(user.router, prefix="/api")
app.include_router(workers.router, prefix="/api")


# WebSocket endpoint for real-time task updates
@app.websocket("/ws/tasks")
async def websocket_tasks_endpoint(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for real-time task updates.

    Authentication is handled via query parameter 'token'.
    Example: ws://localhost:8000/ws/tasks?token=your_auth_token
    """
    from .websocket.task_updates import get_user_from_token

    try:
        # Authenticate user
        user = await get_user_from_token(token)
        # Pass authenticated user to websocket handler
        await websocket_endpoint(websocket, user)
    except Exception as e:
        # Close connection with error code for authentication failure
        await websocket.close(code=1008, reason="Authentication failed")


# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    import logging

    logger = logging.getLogger(__name__)

    # Initialize database connections first
    logger.info("Initializing global database connections...")
    await init_databases()
    logger.info("Global database connections initialized")

    # Initialize task service via dependency injection
    task_service = await get_task_service()
    await notification_service.startup()

    # Start workers for task processing (after databases are initialized)
    await start_workers(task_service)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on application shutdown."""
    # Stop workers first
    await stop_workers(timeout_seconds=30)

    # Then shutdown other services
    await notification_service.shutdown()
    await shutdown_services()

    # Finally close database connections
    await close_databases()
