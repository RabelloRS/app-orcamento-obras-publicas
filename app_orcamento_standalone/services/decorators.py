from typing import Any, Callable, Optional
import inspect
from functools import wraps
from services.cache import cache, cache_key_builder
import logging

logger = logging.getLogger(__name__)

def cached(
    prefix: str,
    ttl: Optional[int] = None,
    key_args: Optional[list] = None
):
    """
    Decorator to cache function results in Redis
    
    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds (overrides default)
        key_args: List of argument names to include in cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Build cache key
            if key_args:
                # Use specified arguments for key
                bound_args = inspect.signature(func).bind(*args, **kwargs)
                bound_args.apply_defaults()
                key_kwargs = {arg: bound_args.arguments[arg] for arg in key_args if arg in bound_args.arguments}
            else:
                # Use all arguments for key
                bound_args = inspect.signature(func).bind(*args, **kwargs)
                bound_args.apply_defaults()
                key_kwargs = bound_args.arguments
            
            cache_key = cache_key_builder(prefix, **key_kwargs)
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Cache miss, execute function
            logger.debug(f"Cache miss for {cache_key}")
            result = await func(*args, **kwargs)
            
            # Cache the result
            await cache.set(cache_key, result, ttl)
            
            return result
        
        return async_wrapper
    
    return decorator

def invalidate_cache(prefix: str, key_args: Optional[list] = None):
    """
    Decorator to invalidate cache after function execution
    
    Args:
        prefix: Cache key prefix to invalidate
        key_args: List of argument names to include in cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs)
            
            # Build cache key for invalidation
            if key_args:
                bound_args = inspect.signature(func).bind(*args, **kwargs)
                bound_args.apply_defaults()
                key_kwargs = {arg: bound_args.arguments[arg] for arg in key_args if arg in bound_args.arguments}
            else:
                bound_args = inspect.signature(func).bind(*args, **kwargs)
                bound_args.apply_defaults()
                key_kwargs = bound_args.arguments
            
            cache_key = cache_key_builder(prefix, **key_kwargs)
            
            # Invalidate specific key
            await cache.delete(cache_key)
            logger.debug(f"Invalidated cache for {cache_key}")
            
            return result
        
        return async_wrapper
    
    return decorator

def invalidate_cache_pattern(prefix: str):
    """
    Decorator to invalidate all cache keys matching pattern
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs)
            
            # Invalidate all keys with prefix
            pattern = f"{prefix}::*"
            count = await cache.clear_pattern(pattern)
            logger.debug(f"Invalidated {count} cache keys with pattern {pattern}")
            
            return result
        
        return async_wrapper
    
    return decorator