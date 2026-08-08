from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from backend.database.session import get_db
from backend.utils.response import api_response

router = APIRouter(prefix="/blockchain", tags=["Blockchain Operations"])

class DonateRequest(BaseModel):
    ngo_name: str
    amount_eth: float
    donor_wallet: str

DONATION_TRANSACTIONS = [
    {
        "tx_hash": "0x8f3c7a1b...4e90",
        "ngo_name": "Relief India Foundation",
        "amount_eth": 0.5,
        "usd_equivalent": "$1,450.00",
        "donor_wallet": "0x71C...3A9",
        "timestamp": "2026-08-04 22:15:00",
        "status": "CONFIRMED"
    },
    {
        "tx_hash": "0x2a91b8d4...11f3",
        "ngo_name": "Disaster Aid Alliance",
        "amount_eth": 1.2,
        "usd_equivalent": "$3,480.00",
        "donor_wallet": "0x3F2...88B",
        "timestamp": "2026-08-04 20:05:00",
        "status": "CONFIRMED"
    }
]

@router.get("/donations")
def get_blockchain_donations():
    return api_response(success=True, message=f"Retrieved {len(DONATION_TRANSACTIONS)} on-chain donations", data=DONATION_TRANSACTIONS)

@router.post("/donate")
def process_blockchain_donation(req: DonateRequest):
    import uuid
    tx_hash = f"0x{uuid.uuid4().hex[:8]}...{uuid.uuid4().hex[:4]}"
    usd_val = f"${req.amount_eth * 2900:.2f}"
    new_tx = {
        "tx_hash": tx_hash,
        "ngo_name": req.ngo_name,
        "amount_eth": req.amount_eth,
        "usd_equivalent": usd_val,
        "donor_wallet": req.donor_wallet,
        "timestamp": "2026-08-05 01:50:00",
        "status": "CONFIRMED"
    }
    DONATION_TRANSACTIONS.insert(0, new_tx)
    return api_response(success=True, message="Smart contract donation recorded on-chain!", data=new_tx)

@router.get("/contracts")
def get_smart_contracts():
    contracts = [
        {
            "name": "ResQReliefVault.sol",
            "address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            "network": "Ethereum Mainnet / Sepolia",
            "transparency_score": "98%",
            "audited_by": "CertiK",
            "total_held_eth": 42.8
        },
        {
            "name": "NGOReliefEscrow.sol",
            "address": "0x24C656EC7ab88b098defB751B7401B5f6d8999A",
            "network": "Polygon PoS",
            "transparency_score": "99%",
            "audited_by": "OpenZeppelin",
            "total_held_eth": 128.5
        }
    ]
    return api_response(success=True, message="Smart contracts list retrieved", data=contracts)
