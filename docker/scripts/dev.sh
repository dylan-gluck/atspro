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
docker-compose exec arangodb arangosh --server.endpoint http+tcp://localhost:8529 --server.password ${ARANGO_ROOT_PASSWORD:-dev_arango_password_change_in_prod} --javascript.execute-string "print('ArangoDB is ready'); db._version();"

echo "✅ All services are healthy!"
echo "🌐 Web app: http://localhost:3000"
echo "🔗 API: http://localhost:8000"
echo "📊 ArangoDB: http://localhost:8529 (root password: see .env)"
echo "🔍 View logs: docker-compose logs -f"