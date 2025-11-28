"""
Simple DDoS protection middleware using cache-based rate limiting.
Limits requests per IP address.
"""
from django.core.cache import cache
from django.http import HttpResponse
from django.conf import settings


class DDoSProtectionMiddleware:
    """Rate limiting middleware to protect against DDoS attacks."""

    def __init__(self, get_response):
        self.get_response = get_response
        # Configurável via settings
        self.rate_limit = getattr(settings, 'DDOS_RATE_LIMIT', 100)  # requests
        self.rate_period = getattr(settings, 'DDOS_RATE_PERIOD', 60)   # seconds

    def __call__(self, request):
        # Get client IP
        # SECURITY NOTE: 'HTTP_X_FORWARDED_FOR' can be spoofed if the application is not behind a trusted proxy
        # that correctly handles this header.
        # Ideally, you should configure your web server (Nginx, Apache, AWS LB) to set this header reliably
        # and filter out spoofed values.
        # As a fallback, we take the first IP in the list, which is standard for X-Forwarded-For chains
        # (client, proxy1, proxy2...), but unsafe if edge is exposed directly to internet.
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR')

        # Create cache key for this IP
        cache_key = f'ddos_limit_{client_ip}'

        # Try to add key with value 1. Returns True if added (didn't exist), False if existed.
        # This sets the timeout only when the key is created (fixed window).
        if cache.add(cache_key, 1, self.rate_period):
            current_count = 1
        else:
            # Key exists, increment it. incr() does not reset the timeout.
            try:
                current_count = cache.incr(cache_key)
            except ValueError:
                # Key might have expired or been evicted
                cache.set(cache_key, 1, self.rate_period)
                current_count = 1

        if current_count > self.rate_limit:
            # Too many requests
            return HttpResponse(
                'Too many requests. Please try again later.',
                status=429,
                content_type='text/plain'
            )

        response = self.get_response(request)
        return response
