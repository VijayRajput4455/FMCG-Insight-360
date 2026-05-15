import asyncio
import logging

from sqlalchemy import text
from app.core.metrics import DB_CONNECTIONS
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


def update_db_connections():

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT count(*)
                FROM pg_stat_activity
                WHERE state = 'active'
            """)
        )

        active_connections = result.scalar()

        DB_CONNECTIONS.set(active_connections)

    except Exception as e:

        logger.error(f"DB metrics worker error: {e}")

    finally:

        db.close()


async def db_metrics_worker():

    while True:

        update_db_connections()

        await asyncio.sleep(5)