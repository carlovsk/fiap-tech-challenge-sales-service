#!/bin/bash

# Integration Test Runner Script
# This script starts the test environment, runs k6 integration tests, and cleans up.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🚀 Starting integration test environment..."

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🧹 Cleaning up test environment..."
  docker compose -f infra/docker/docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Stop any existing test containers
docker compose -f infra/docker/docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true

# Start the test environment
echo "📦 Starting PostgreSQL and application containers..."
docker compose -f infra/docker/docker-compose.test.yml up -d

# Wait for the application to be healthy
echo "⏳ Waiting for application to be healthy..."
MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker compose -f infra/docker/docker-compose.test.yml exec -T app wget -q --spider http://localhost:3001/health 2>/dev/null; then
    echo "✅ Application is healthy!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Application failed to become healthy after $MAX_RETRIES attempts"
    echo "📋 Application logs:"
    docker compose -f infra/docker/docker-compose.test.yml logs app
    exit 1
  fi
  
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES - waiting for service..."
  sleep 2
done

# Small delay to ensure everything is ready
sleep 2

# Run k6 integration tests
echo ""
echo "🧪 Running k6 integration tests..."
echo "=================================="

if ! command -v k6 &> /dev/null; then
  echo "❌ k6 is not installed. Please install k6 first."
  echo "   See README.md for installation instructions."
  exit 1
fi

k6 run k6/integration-tests.js

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ All integration tests passed!"
else
  echo ""
  echo "❌ Integration tests failed with exit code: $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE

