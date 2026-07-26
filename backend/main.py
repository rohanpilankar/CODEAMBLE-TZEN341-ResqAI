import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from backend.config import settings
from backend.database.init_db import init_db
from backend.websocket.manager import ws_manager
from backend.websocket.events import WSEvent, WSEventType
from backend.utils.logger import app_logger

from backend.routers import auth, users, incidents, shelters, resources, notifications, analytics, ai

@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logger.info(f"Starting {settings.APP_NAME}...")
    init_db()
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "incidents"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "profiles"),  exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "documents"), exist_ok=True)
    yield
    app_logger.info(f"Shutting down {settings.APP_NAME}.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Disaster Response & Emergency Coordination Platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# ─── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static File Serving ───────────────────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ─── API Routers ───────────────────────────────────────────────────────────────
prefix = settings.API_PREFIX
app.include_router(auth.router,          prefix=prefix)
app.include_router(users.router,         prefix=prefix)
app.include_router(incidents.router,     prefix=prefix)
app.include_router(shelters.router,      prefix=prefix)
app.include_router(resources.router,     prefix=prefix)
app.include_router(notifications.router, prefix=prefix)
app.include_router(analytics.router,     prefix=prefix)
app.include_router(ai.router,            prefix=prefix)

# ─── WebSocket Endpoint ────────────────────────────────────────────────────────
@app.websocket(f"{settings.WS_PREFIX}/{{client_id}}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            app_logger.info(f"WS message from {client_id}: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        app_logger.info(f"WebSocket client disconnected: {client_id}")

# ─── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "1.0.0"}

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.APP_NAME} API. Visit /api/docs for documentation."}
