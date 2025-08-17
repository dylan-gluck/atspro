"""Database connection management for PostgreSQL, Redis, and ArangoDB."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

import redis.asyncio as redis
from arango import ArangoClient
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from ..config import settings

logger = logging.getLogger(__name__)

# Global connection instances
_postgres_pool: Optional[AsyncConnectionPool] = None
_redis_client: Optional[redis.Redis] = None
_arango_client: Optional[ArangoClient] = None
_arango_db = None


async def init_postgres() -> AsyncConnectionPool:
    """Initialize PostgreSQL connection pool."""
    global _postgres_pool

    if _postgres_pool is not None:
        return _postgres_pool

    try:
        _postgres_pool = AsyncConnectionPool(
            settings.database_url,
            min_size=2,
            max_size=10,
            timeout=30.0,
            max_idle=300.0,
            max_lifetime=3600.0,
            kwargs={
                "row_factory": dict_row,
                "autocommit": False,
            },
        )

        # Wait for pool to initialize
        await _postgres_pool.wait()
        logger.info("PostgreSQL connection pool initialized")
        return _postgres_pool

    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL pool: {e}")
        # Clean up global reference on failure
        _postgres_pool = None
        raise


async def init_redis() -> redis.Redis:
    """Initialize Redis client with proper connection pooling and timeout configuration."""
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    try:
        # Create connection pool with proper configuration
        connection_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=30.0,  # Must be > BRPOP timeout (10s)
            socket_connect_timeout=10.0,  # Connection establishment timeout
            socket_keepalive=True,  # Enable keepalive
            socket_keepalive_options={},  # Use system defaults
            retry_on_timeout=True,
            retry_on_error=[ConnectionError, TimeoutError],
            health_check_interval=30,
            max_connections=20,  # Pool size
        )

        _redis_client = redis.Redis(connection_pool=connection_pool)

        # Test connection with proper error handling
        try:
            await _redis_client.ping()
            logger.info(
                "Redis client initialized with connection pool (socket_timeout=30s)"
            )
        except Exception as ping_error:
            logger.error(f"Redis ping failed during initialization: {ping_error}")
            # Try to close the pool and re-raise
            await connection_pool.disconnect()
            raise

        return _redis_client

    except Exception as e:
        logger.error(f"Failed to initialize Redis client: {e}")
        # Clean up global reference on failure
        _redis_client = None
        raise


def init_arango():
    """Initialize ArangoDB client and database."""
    global _arango_client, _arango_db

    if _arango_client is not None and _arango_db is not None:
        return _arango_db

    try:
        _arango_client = ArangoClient(hosts=settings.arango_url)

        # Connect to database
        _arango_db = _arango_client.db(
            settings.arango_database,
            username=settings.arango_username,
            password=settings.arango_password,
        )

        # Test connection
        _arango_db.properties()
        logger.info("ArangoDB client initialized")
        return _arango_db

    except Exception as e:
        logger.error(f"Failed to initialize ArangoDB client: {e}")
        # Clean up global references on failure
        _arango_client = None
        _arango_db = None
        raise


async def init_databases():
    """Initialize all database connections."""
    logger.info("Initializing database connections...")

    # Initialize all connections concurrently
    await asyncio.gather(
        init_postgres(),
        init_redis(),
        asyncio.create_task(asyncio.to_thread(init_arango)),
    )

    logger.info("All database connections initialized")


async def close_databases():
    """Close all database connections."""
    global _postgres_pool, _redis_client, _arango_client, _arango_db

    logger.info("Closing database connections...")

    # Close PostgreSQL pool
    if _postgres_pool is not None:
        await _postgres_pool.close()
        _postgres_pool = None
        logger.info("PostgreSQL pool closed")

    # Close Redis client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis client closed")

    # Close ArangoDB (no async close needed)
    if _arango_client is not None:
        _arango_client = None
        _arango_db = None
        logger.info("ArangoDB client closed")


def get_postgres_pool() -> AsyncConnectionPool:
    """Get the PostgreSQL connection pool."""
    if _postgres_pool is None:
        raise RuntimeError(
            "PostgreSQL pool not initialized. Call init_databases() first."
        )
    return _postgres_pool


def get_redis_client() -> redis.Redis:
    """Get the Redis client."""
    if _redis_client is None:
        raise RuntimeError("Redis client not initialized. Call init_databases() first.")
    return _redis_client


def get_arango_client():
    """Get the ArangoDB database instance."""
    if _arango_db is None:
        raise RuntimeError("ArangoDB not initialized. Call init_databases() first.")
    return _arango_db


@asynccontextmanager
async def get_postgres_connection():
    """Get a PostgreSQL connection from the pool."""
    pool = get_postgres_pool()
    async with pool.connection() as conn:
        yield conn


@asynccontextmanager
async def get_postgres_transaction():
    """Get a PostgreSQL transaction."""
    async with get_postgres_connection() as conn:
        async with conn.transaction():
            yield conn


# Health check functions for monitoring connection state
async def check_postgres_health() -> dict:
    """Check PostgreSQL connection health."""
    try:
        if _postgres_pool is None:
            return {"status": "down", "error": "Pool not initialized"}

        async with get_postgres_connection() as conn:
            await conn.execute("SELECT 1")

        return {
            "status": "up",
            "pool_size": _postgres_pool.get_stats().get("pool_size", 0),
            "pool_available": _postgres_pool.get_stats().get("pool_available", 0),
        }
    except Exception as e:
        return {"status": "down", "error": str(e)}


async def check_redis_health() -> dict:
    """Check Redis connection health."""
    try:
        if _redis_client is None:
            return {"status": "down", "error": "Client not initialized"}

        # Use ping with timeout to check health
        await _redis_client.ping()

        # Get connection pool info if available
        pool_info = {}
        if hasattr(_redis_client, "connection_pool"):
            pool = _redis_client.connection_pool
            pool_info = {
                "max_connections": getattr(pool, "max_connections", 0),
                "created_connections": len(getattr(pool, "_created_connections", [])),
            }

        return {"status": "up", **pool_info}
    except Exception as e:
        return {"status": "down", "error": str(e)}


def check_arango_health() -> dict:
    """Check ArangoDB connection health."""
    try:
        if _arango_client is None or _arango_db is None:
            return {"status": "down", "error": "Client not initialized"}

        # Test with a simple database properties call
        properties = _arango_db.properties()

        return {
            "status": "up",
            "database": properties.get("name"),
            "version": properties.get("version"),
        }
    except Exception as e:
        return {"status": "down", "error": str(e)}


async def check_all_databases_health() -> dict:
    """Check health of all database connections."""
    postgres_health = await check_postgres_health()
    redis_health = await check_redis_health()

    # Run ArangoDB check in thread since it's synchronous
    arango_health = await asyncio.to_thread(check_arango_health)

    # Determine overall status
    all_up = all(
        health["status"] == "up"
        for health in [postgres_health, redis_health, arango_health]
    )

    return {
        "status": "up" if all_up else "degraded",
        "databases": {
            "postgresql": postgres_health,
            "redis": redis_health,
            "arangodb": arango_health,
        },
    }
