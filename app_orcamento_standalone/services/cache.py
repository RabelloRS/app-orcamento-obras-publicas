from typing import Any, Optional
import json
import asyncio
from redis.asyncio import Redis
from settings import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

class RedisCache:
    def __init__(self):
        self.redis: Optional[Redis] = None
        self._connection_lock = asyncio.Lock()
    
    async def connect(self):
        """Connect to Redis server"""
        if self.redis is None:
            async with self._connection_lock:
                if self.redis is None:
                    try:
                        self.redis = Redis.from_url(
                            settings.REDIS_URL,
                            encoding="utf-8",
                            decode_responses=True
                        )
                        # Test connection
                        await self.redis.ping()
                        logger.info("Connected to Redis successfully")
                    except Exception as e:
                        logger.error(f"Failed to connect to Redis: {e}")
                        self.redis = None
                        raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            self.redis = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if self.redis is None:
            await self.connect()
        
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Error getting cache key {key}: {e}")
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        if self.redis is None:
            await self.connect()
        
        try:
            serialized = json.dumps(value)
            ttl = ttl or settings.CACHE_TTL
            await self.redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if self.redis is None:
            await self.connect()
        
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Error deleting cache key {key}: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear keys matching pattern"""
        if self.redis is None:
            await self.connect()
        
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.warning(f"Error clearing cache pattern {pattern}: {e}")
            return 0

# Global cache instance
cache = RedisCache()

def cache_key_builder(
    prefix: str, 
    **kwargs
) -> str:
    """Build consistent cache keys"""
    key_parts = [prefix]
    for k, v in sorted(kwargs.items()):
        if v is not None:
            key_parts.append(f"{k}:{v}")
    return "::".join(key_parts)