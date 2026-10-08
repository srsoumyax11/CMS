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

import socket

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
                supabase.storage.create_bucket(bucket_name, options={"public": config["public"]})
            else:
                logger.info(f"✅ Bucket '{bucket_name}' exists.")
                
    except Exception as e:
        logger.error(f"❌ Failed to verify/create Supabase buckets: {e}")
        raise e

async def check_smtp_status():
    """Verify SMTP server connectivity and log a warning if unreachable."""
    logger.info("Checking SMTP Server connectivity...")
    try:
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.begin() as conn:
            res = await conn.execute(text("SELECT key, value FROM system_settings WHERE key IN ('smtp_host', 'smtp_port', 'global_email_enabled')"))
            rows = {row[0]: row[1] for row in res.fetchall()}
        await engine.dispose()
        
        if rows.get("global_email_enabled", "true").lower() != "true":
            logger.info("ℹ️ Global emails are disabled in system_settings. Skipping SMTP ping.")
            return

        host = rows.get("smtp_host", "127.0.0.1")
        port = int(rows.get("smtp_port", "54325"))

        try:
            with socket.create_connection((host, port), timeout=3):
                logger.info(f"✅ SMTP server ({host}:{port}) connection successful.")
        except Exception as e:
            logger.warning(f"⚠️ SMTP server ({host}:{port}) unreachable ({e}). Dev emails will log to terminal.")
    except Exception as err:
        logger.warning(f"⚠️ Could not verify SMTP settings from DB: {err}")

def ensure_redis_container():
    """Ensure local Redis Docker container is running with published port 6379."""
    import subprocess
    logger.info("Checking Redis Docker container status...")
    try:
        res = subprocess.run(["docker", "ps", "--filter", "name=cms-redis", "--format", "{{.Ports}}"], capture_output=True, text=True)
        if "6379->" in res.stdout:
            logger.info("✅ Local Redis container 'cms-redis' is running on port 6379.")
            return

        logger.info("Starting / creating local Redis Docker container ('cms-redis')...")
        subprocess.run(["docker", "rm", "-f", "cms-redis"], capture_output=True, text=True)
        subprocess.run(["docker", "run", "-d", "--name", "cms-redis", "-p", "6379:6379", "redis:alpine"], capture_output=True, text=True)
        logger.info("✅ Redis container started successfully on port 6379!")
    except Exception as e:
        logger.warning(f"⚠️ Could not start Redis Docker container ({e}). Rate limiting will fail open cleanly.")

async def main():
    logger.info("Starting pre-flight checks...")
    await check_database()
    check_and_create_buckets()
    await check_smtp_status()
    ensure_redis_container()
    logger.info("✅ All pre-flight checks passed!")

    logger.info("✅ Pre-start checks and seeding completed!")

if __name__ == "__main__":
    asyncio.run(main())
