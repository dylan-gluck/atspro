#!/bin/bash
set -e

echo "🚀 Starting ATSPro development environment..."

# Create required directories
mkdir -p docker/postgres/init

# Start services
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
docker-compose exec postgres pg_isready -U atspro_user -d atspro

echo "✅ All services are healthy!"
echo "🌐 Web app: http://localhost:3000"
echo "🔗 API: http://localhost:8000"
echo "🔍 View logs: docker-compose logs -f"