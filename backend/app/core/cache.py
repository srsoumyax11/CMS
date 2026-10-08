import logging
import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)
redis_client: Optional[aioredis.Redis] = None

async def init_redis():
    global redis_client
    redis_url = getattr(settings, "REDIS_URL", "redis://127.0.0.1:6379")
    try:
        client = aioredis.from_url(
            redis_url, 
            decode_responses=True, 
            socket_connect_timeout=0.2, 
            socket_timeout=0.2
        )
        await client.ping()
        redis_client = client
        logger.info("✅ Redis server ping successful!")
    except Exception as e:
        logger.warning(f"⚠️ Redis server is offline/unreachable ({e}). Rate limiting disabled (failing open).")
        redis_client = None

async def close_redis():
    global redis_client
    if redis_client:
        try:
            await redis_client.aclose()
        except Exception:
            pass
        redis_client = None
