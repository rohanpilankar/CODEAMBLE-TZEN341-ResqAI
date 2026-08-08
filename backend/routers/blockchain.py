from fastapi import APIRouter
from backend.utils.response import api_response

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])

@router.get("/donations")
def get_blockchain_donations():
    mock_donations = [
        {
            "tx_hash": "0x8f3a91b2c4e5d6f7a8b9c0d1e2f3a4b5c6d7e8f9",
            "donor": "0x1234...5678",
            "amount_eth": 1.5,
            "cause": "Kerala Flood Relief",
            "timestamp": "2026-08-08T12:00:00Z",
            "verified": True
        },
        {
            "tx_hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
            "donor": "0x9876...4321",
            "amount_eth": 0.5,
            "cause": "Emergency Medical Supplies",
            "timestamp": "2026-08-08T14:30:00Z",
            "verified": True
        }
    ]
    return api_response(success=True, message="Blockchain donations retrieved", data=mock_donations)
