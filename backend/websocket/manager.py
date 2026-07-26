from typing import Dict, List
from fastapi import WebSocket
from backend.websocket.events import WSEvent
from backend.utils.logger import app_logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        app_logger.info(f"WebSocket connected: {client_id}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            app_logger.info(f"WebSocket disconnected: {client_id}")

    async def send_personal_message(self, event: WSEvent, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(event.model_dump())

    async def broadcast(self, event: WSEvent):
        disconnected = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(event.model_dump())
            except Exception as e:
                app_logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)
        for client_id in disconnected:
            self.disconnect(client_id)

ws_manager = ConnectionManager()
