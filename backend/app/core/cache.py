import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

redis_client: Optional[aioredis.Redis] = None

async def init_redis():
    global redis_client
    # Make sure to handle standard redis URLs
    # If the user hasn't defined REDIS_URL, we fallback to a default locally
    redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
