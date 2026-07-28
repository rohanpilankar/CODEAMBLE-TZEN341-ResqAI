"""
Standardized API response helper.
All endpoints should return: { "success": bool, "message": str, "data": Any }
"""
from fastapi.responses import JSONResponse
from typing import Any, Optional


def api_response(
    success: bool = True,
    message: str = "OK",
    data: Any = None,
    status_code: int = 200
) -> JSONResponse:
    """Return a standardized JSON response envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": success,
            "message": message,
            "data": data if data is not None else {}
        }
    )


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    data: Any = None
) -> JSONResponse:
    """Return a standardized error response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": data if data is not None else {}
        }
    )
