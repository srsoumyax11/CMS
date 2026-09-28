import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text
from tenacity import retry, stop_after_attempt, wait_fixed
from app.core.config import settings
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants for bucket configuration
REQUIRED_BUCKETS = {
    "avatars": {"public": True},
    "notice-attachments": {"public": True},
    "complaint-attachments": {"public": False},
}

@retry(stop=stop_after_attempt(5), wait=wait_fixed(3))
async def check_database():
    """Attempt to connect to the database with exponential backoff."""
    logger.info("Attempting to connect to the database...")
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise e
    finally:
        await engine.dispose()

def check_and_create_buckets():
    """Verify Supabase buckets exist, create them if they do not."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials missing. Skipping bucket checks.")
        return

    logger.info("Checking Supabase Storage Buckets...")
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    try:
        # Get list of existing buckets
        existing_buckets = [b.name for b in supabase.storage.list_buckets()]
        
        for bucket_name, config in REQUIRED_BUCKETS.items():
            if bucket_name not in existing_buckets:
                logger.info(f"Creating missing bucket: '{bucket_name}' (Public: {config['public']})")
                supabase.storage.create_bucket(bucket_name, {"public": config["public"]})
            else:
                logger.info(f"✅ Bucket '{bucket_name}' exists.")
                
    except Exception as e:
        logger.error(f"❌ Failed to verify/create Supabase buckets: {e}")
        raise e

async def main():
    logger.info("Starting pre-flight checks...")
    await check_database()
    check_and_create_buckets()
    logger.info("✅ All pre-flight checks passed!")

if __name__ == "__main__":
    asyncio.run(main())
