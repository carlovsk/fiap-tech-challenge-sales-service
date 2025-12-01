#!/bin/sh
set -e

# Construct DATABASE_URL from individual components if not set
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres-sales:5432/${POSTGRES_DB}?schema=public&sslmode=disable"
fi

# Run migrations
npx prisma migrate deploy

# Start the server
exec node dist/src/server.js

