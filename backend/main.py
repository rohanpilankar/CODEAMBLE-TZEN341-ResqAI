import os
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from backend.config import settings
from backend.database.init_db import init_db
from backend.websocket.manager import ws_manager
from backend.auth.dependencies import get_ws_current_user
from backend.utils.logger import app_logger

from backend.routers import auth, users, incidents, shelters, resources, notifications, analytics, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logger.info(f"Starting {settings.APP_NAME} v1.0.0 ...")
    init_db()
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "incidents"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "profiles"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "documents"), exist_ok=True)
    yield
    app_logger.info(f"Shutting down {settings.APP_NAME}.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Disaster Response & Emergency Coordination Platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── CORS ──────────────────────────────────────────────────────────────────────
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    if cors_origins == "*":
        cors_origins = ["*"]
    else:
        cors_origins = [o.strip() for o in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handlers ─────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail, "data": {}}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({"field": field, "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation failed. Please check your input.",
            "data": {"errors": errors}
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Unexpected error at {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred. Please try again later.",
            "data": {}
        }
    )

# ─── Static File Serving ───────────────────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ─── API Routers ───────────────────────────────────────────────────────────────
prefix = settings.API_PREFIX
app.include_router(auth.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)
app.include_router(incidents.router, prefix=prefix)
app.include_router(shelters.router, prefix=prefix)
app.include_router(resources.router, prefix=prefix)
app.include_router(notifications.router, prefix=prefix)
app.include_router(analytics.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)

# ─── WebSocket Endpoint (JWT Authenticated) ────────────────────────────────────
@app.websocket(f"{settings.WS_PREFIX}/{{client_id}}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    user = await get_ws_current_user(websocket)
    if user is None:
        await websocket.close(code=4001, reason="Unauthorized: valid JWT token required.")
        app_logger.warning(f"Rejected unauthenticated WebSocket from: {client_id}")
        return

    user_id = user.id
    role = user.role_rel.name
    await ws_manager.connect(client_id, websocket, user_id, role)
    try:
        while True:
            data = await websocket.receive_text()
            app_logger.info(f"WS message from {client_id} (User #{user_id}): {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)


# ─── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "ws_connections": ws_manager.connection_count,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.APP_NAME} API. Visit /api/docs for documentation."}
