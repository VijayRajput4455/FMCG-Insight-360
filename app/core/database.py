import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from sqlalchemy import text
from sqlalchemy.engine import make_url

logger = logging.getLogger(__name__)

# Engine (connection pool handled automatically)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True
)

# Session (used per request)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()

from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        logger.exception("Unhandled DB session error")
        raise
    finally:
        db.close()


def get_database_status() -> tuple[bool, str]:
    """Validate DB connection and report which database is actually connected."""
    try:
        expected_db = make_url(settings.DATABASE_URL).database
    except Exception:
        expected_db = None

    try:
        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT current_database() AS db_name,
                           current_user AS db_user,
                           inet_server_addr()::text AS db_host,
                           inet_server_port() AS db_port
                    """
                )
            ).mappings().one()

        connected_db = row["db_name"]
        if expected_db and connected_db != expected_db:
            msg = f"Connected to unexpected DB '{connected_db}' (expected '{expected_db}')"
            logger.error(msg)
            return False, msg

        msg = f"Postgres connected successfully: db={connected_db}, user={row['db_user']}, host={row['db_host']}, port={row['db_port']}"
        logger.info(msg)
        return True, msg
    except Exception as exc:
        msg = f"Failed to connect to Postgres: {exc}"
        logger.error(msg)
        return False, msg