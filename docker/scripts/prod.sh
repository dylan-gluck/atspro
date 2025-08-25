#!/bin/bash
set -e

echo "🚀 Starting ATSPro production environment..."

# Create required directories
mkdir -p docker/postgres/init

# Build and start services in production mode
docker-compose -f docker-compose.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
docker-compose exec postgres pg_isready -U atspro_user -d atspro

echo "✅ All services are healthy!"
echo "🌐 Web app: http://localhost:3000"
echo "🔗 API: http://localhost:8000"
echo "🔍 View logs: docker-compose logs -f"