from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from backend.services.routing_service import routing_service
from backend.utils.logger import app_logger

router = APIRouter(prefix="/route", tags=["Routing"])

@router.get("")
@router.get("/")
async def get_real_road_route(
    startLat: float = Query(..., ge=-90.0, le=90.0, description="Start Latitude"),
    startLng: float = Query(..., ge=-180.0, le=180.0, description="Start Longitude"),
    endLat: float = Query(..., ge=-90.0, le=90.0, description="Destination Latitude"),
    endLng: float = Query(..., ge=-180.0, le=180.0, description="Destination Longitude"),
    profile: str = Query("driving", description="Routing profile: driving, emergency, walking, cycling"),
    routeMode: str = Query("fastest", description="Route mode: fastest, shortest, safest, emergency")
):
    """
    Computes real road-following navigation route using OpenStreetMap OSRM driving engine
    integrated with AI-Ready Safety Scoring Service.
    Returns GeoJSON LineString coordinates, distance, duration, turn-by-turn steps,
    safety score, risk level, and alternative routes.
    """
    try:
        result = await routing_service.compute_route(
            start_lat=startLat,
            start_lng=startLng,
            end_lat=endLat,
            end_lng=endLng,
            profile=profile,
            route_mode=routeMode
        )
        return {
            "success": True,
            "data": result
        }

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except ConnectionError as ce:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Routing Network Unavailable: {str(ce)}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(re)
        )
    except Exception as exc:
        app_logger.error(f"[RoutingRouter] Unexpected error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate route: {str(exc)}"
        )
