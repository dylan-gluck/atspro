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
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Copy pyproject.toml and uv.lock first for better layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies only (no local package)
RUN --mount=type=cache,target=/opt/uv-cache \
    uv pip install --system fastapi[standard] google-genai httpx openai openai-agents python-multipart unstructured[doc,docx,md,pdf,rtf] vlmrun-hub

# Copy application code
COPY . .

# Create a non-root user and uv cache directory
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /opt/uv-cache && chown -R appuser:appuser /opt/uv-cache
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]