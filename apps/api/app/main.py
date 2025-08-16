from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .routers import job, linkedin, optimize, parse, tasks
from .websocket.task_updates import websocket_endpoint
from .services.notification_service import notification_service
from .routers.tasks import task_service

app = FastAPI()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "atspro-api"}


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

app.include_router(parse.router)
app.include_router(linkedin.router)
app.include_router(job.router)
app.include_router(optimize.router)
app.include_router(tasks.router)


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
    await task_service.startup()
    await notification_service.startup()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup services on application shutdown."""
    await notification_service.shutdown()
    await task_service.shutdown()
