import os
import pytest
from fastapi.testclient import TestClient
from backend.database.session import Base, engine
from backend.database.init_db import init_db
from backend.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Drop and recreate the DB, then seed data before running any tests."""
    db_file = "resqai.db"
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
    Base.metadata.drop_all(bind=engine)
    init_db()

@pytest.fixture(scope="session")
def test_client(setup_test_database):
    """Shared TestClient that triggers the FastAPI lifespan events."""
    with TestClient(app) as c:
        yield c
