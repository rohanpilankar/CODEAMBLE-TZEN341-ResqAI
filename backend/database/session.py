from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings
import logging

logger = logging.getLogger("app")

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}

# SQLite doesn't support pool_size / max_overflow (uses StaticPool internally),
# so we only configure those for real databases (Postgres, MySQL, etc.).
pool_kwargs = dict(
    pool_pre_ping=True,
    pool_recycle=1800,  # recycle connections every 30 min
)
if not is_sqlite:
    pool_kwargs.update(pool_size=5, max_overflow=10)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **pool_kwargs,
)

if is_sqlite:
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Yield a DB session; always closes it, logs unexpected errors."""
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        logger.error(f"Database session error: {exc}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()
