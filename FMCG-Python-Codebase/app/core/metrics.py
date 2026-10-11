from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response, Request
import time
from typing import Callable

# Request metrics
REQUEST_COUNT = Counter(
    'fmcg_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'fmcg_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

# Business metrics
AUDIT_REQUESTS = Counter(
    'fmcg_audit_requests_total',
    'Total audit detection requests',
    ['product_code', 'status']
)

RATE_LIMIT_EXCEEDED = Counter(
    'fmcg_rate_limit_exceeded_total',
    'Total rate limit violations',
    ['endpoint', 'ip']
)

# System metrics
ACTIVE_CONNECTIONS = Gauge(
    'fmcg_active_connections',
    'Number of active connections'
)

# Database metrics
DB_CONNECTIONS = Gauge(
    'fmcg_db_connections_active',
    'Number of active database connections'
)

# Cache metrics
CACHE_HITS = Counter(
    'fmcg_cache_hits_total',
    'Total cache hits'
)

CACHE_MISSES = Counter(
    'fmcg_cache_misses_total',
    'Total cache misses'
)

# Queue metrics
QUEUE_SIZE = Gauge(
    'fmcg_queue_size',
    'Current queue size',
    ['queue_name']
)

async def metrics_endpoint(request: Request):
    """Prometheus metrics endpoint"""
    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

def track_requests(request: Request, response, process_time: float):
    """Middleware to track request metrics"""
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(process_time)

def increment_audit_request(product_code: str, status: str = "success"):
    """Track audit requests"""
    AUDIT_REQUESTS.labels(product_code=product_code, status=status).inc()

def increment_rate_limit(endpoint: str, ip: str):
    """Track rate limit violations"""
    RATE_LIMIT_EXCEEDED.labels(endpoint=endpoint, ip=ip).inc()

def update_cache_metrics(hit: bool):
    """Track cache performance"""
    if hit:
        CACHE_HITS.inc()
    else:
        CACHE_MISSES.inc()

def update_queue_size(queue_name: str, size: int):
    """Update queue size metric"""
    QUEUE_SIZE.labels(queue_name=queue_name).set(size)