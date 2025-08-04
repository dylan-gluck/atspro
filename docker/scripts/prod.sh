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
docker-compose exec redis redis-cli ping
docker-compose exec arangodb curl -f http://localhost:8529/_api/version

echo "✅ All services are healthy!"
echo "🌐 Web app: http://localhost:3000"
echo "🔗 API: http://localhost:8000"
echo "📊 ArangoDB: http://localhost:8529 (root password: see .env)"
echo "🔍 View logs: docker-compose logs -f"