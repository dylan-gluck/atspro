# Use Python 3.11 slim image as base
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_CACHE_DIR=/opt/uv-cache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libgl1 \
    libegl1 \
    libmagic1 \
    file \
    libglib2.0-0 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Copy pyproject.toml and uv.lock first for better layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies from pyproject.toml
RUN --mount=type=cache,target=/opt/uv-cache \
    uv pip install --system \
    "fastapi[standard]>=0.115.8" \
    "google-genai>=1.2.0" \
    "httpx>=0.28.1" \
    "openai>=1.65.4" \
    "openai-agents>=0.0.14" \
    "python-multipart>=0.0.20" \
    "unstructured[doc,docx,md,pdf,rtf]>=0.16.23" \
    "vlmrun-hub>=0.1.30" \
    "psycopg[binary,pool]>=3.1.0" \
    "redis>=5.0.0" \
    "python-arango>=7.5.0" \
    "rq>=1.15.0" \
    "sse-starlette>=1.6.0" \
    "alembic>=1.12.0" \
    "pydantic-settings>=2.0.0"

# Copy application code
COPY . .

# Create a non-root user and uv cache directory
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser
RUN mkdir -p /opt/uv-cache /home/appuser && chown -R appuser:appuser /opt/uv-cache /home/appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]