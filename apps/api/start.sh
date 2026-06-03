#!/bin/sh
echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Migrations skipped or already applied"
echo "Starting API..."
exec node dist/index.js
