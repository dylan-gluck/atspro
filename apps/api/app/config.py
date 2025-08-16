"""Configuration management for ATSPro API."""

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Database connections
    database_url: str = Field(
        default="postgresql://atspro_user:atspro_password@localhost:5432/atspro",
        description="PostgreSQL database URL",
    )
    redis_url: str = Field(
        default="redis://localhost:6379", description="Redis connection URL"
    )
    arango_url: str = Field(
        default="http://localhost:8529", description="ArangoDB connection URL"
    )
    arango_database: str = Field(default="atspro", description="ArangoDB database name")
    arango_username: Optional[str] = Field(
        default=None, description="ArangoDB username"
    )
    arango_password: Optional[str] = Field(
        default=None, description="ArangoDB password"
    )

    # Worker settings
    worker_concurrency: int = Field(
        default=3, description="Default worker concurrency level"
    )
    task_timeout_seconds: int = Field(
        default=300, description="Default task timeout in seconds"
    )
    max_retries: int = Field(default=3, description="Default maximum retry attempts")
    result_ttl_hours: int = Field(default=24, description="Task result TTL in hours")

    # Queue settings
    redis_queue_prefix: str = Field(
        default="atspro", description="Redis queue key prefix"
    )
    high_priority_workers: int = Field(
        default=2, description="Number of high priority workers"
    )
    normal_priority_workers: int = Field(
        default=3, description="Number of normal priority workers"
    )
    low_priority_workers: int = Field(
        default=1, description="Number of low priority workers"
    )

    # Task cleanup
    cleanup_interval_seconds: int = Field(
        default=300, description="Cleanup task interval in seconds"
    )

    # Health monitoring
    health_check_interval_seconds: int = Field(
        default=30, description="Worker health check interval in seconds"
    )

    # API settings
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="CORS allowed origins",
    )

    # AI API keys
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    gemini_api_key: Optional[str] = Field(
        default=None, description="Google Gemini API key"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()
