from typing import Dict, Optional
from dataclasses import dataclass, field
from fastapi import WebSocket
from backend.websocket.events import WSEvent
from backend.utils.logger import app_logger


@dataclass
class ConnectedClient:
    websocket: WebSocket
    user_id: Optional[int] = None
    role: Optional[str] = None


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, ConnectedClient] = {}

    async def connect(self, client_id: str, websocket: WebSocket, user_id: int = None, role: str = None):
        await websocket.accept()
        self.active_connections[client_id] = ConnectedClient(
            websocket=websocket, user_id=user_id, role=role
        )
        app_logger.info(f"WebSocket connected: {client_id} (User #{user_id}, Role: {role})")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            app_logger.info(f"WebSocket disconnected: {client_id}")

    async def send_personal_message(self, event: WSEvent, client_id: str):
        client = self.active_connections.get(client_id)
        if client:
            try:
                await client.websocket.send_json(event.model_dump())
            except Exception as e:
                app_logger.error(f"Error sending to {client_id}: {e}")
                self.disconnect(client_id)

    async def send_to_user(self, event: WSEvent, user_id: int):
        """Send an event to all connections belonging to a specific user."""
        for client_id, client in list(self.active_connections.items()):
            if client.user_id == user_id:
                try:
                    await client.websocket.send_json(event.model_dump())
                except Exception:
                    self.disconnect(client_id)

    async def send_to_role(self, event: WSEvent, role: str):
        """Send an event to all connections with a specific role."""
        for client_id, client in list(self.active_connections.items()):
            if client.role and client.role.lower() == role.lower():
                try:
                    await client.websocket.send_json(event.model_dump())
                except Exception:
                    self.disconnect(client_id)

    async def broadcast(self, event: WSEvent):
        """Broadcast to all connected clients."""
        disconnected = []
        for client_id, client in self.active_connections.items():
            try:
                await client.websocket.send_json(event.model_dump())
            except Exception as e:
                app_logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)
        for client_id in disconnected:
            self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


ws_manager = ConnectionManager()
