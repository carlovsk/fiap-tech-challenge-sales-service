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
  docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" down -v --remove-orphans 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Stop any existing test containers
docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" down -v --remove-orphans 2>/dev/null || true

# Start the test environment
echo "📦 Starting PostgreSQL and application containers..."
docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" up -d

# Wait for the application to be healthy
echo "⏳ Waiting for application to be healthy..."
MAX_RETRIES=90
RETRY_COUNT=0

# First, wait for container to be running
echo "  Waiting for container to start..."
while [ $RETRY_COUNT -lt 30 ]; do
  if docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" ps app | grep -q "Up"; then
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 1
done

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Check if container is still running
  if ! docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" ps app | grep -q "Up"; then
    echo "❌ Container stopped unexpectedly!"
    echo "📋 Application logs:"
    docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" logs app
    exit 1
  fi
  
  # Try to check health endpoint using curl (more reliable than wget)
  if docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" exec -T app sh -c "curl -f -s http://localhost:3001/health > /dev/null 2>&1" 2>/dev/null; then
    echo "✅ Application is healthy!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Application failed to become healthy after $MAX_RETRIES attempts"
    echo "📋 Application logs:"
    docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" logs app
    echo ""
    echo "📋 Container status:"
    docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" ps app
    exit 1
  fi
  
  if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
    echo "  Attempt $RETRY_COUNT/$MAX_RETRIES - waiting for service..."
    # Show recent logs every 5 attempts
    echo "  Recent logs:"
    docker compose -f infra/docker/docker-compose.test.yml --project-directory "$PROJECT_DIR" logs --tail=5 app
  fi
  
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

