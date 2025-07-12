#!/bin/bash

# Build script for Vercel deployment
# This script handles builds when DATABASE_URL might not be available at build time

echo "Starting build process..."

# Set a dummy DATABASE_URL if not present (for build time only)
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, using dummy value for build"
  export DATABASE_URL="postgresql://dummy:dummy@dummy/dummy?sslmode=require"
fi

# Run the Next.js build
npm run build

# Unset the dummy DATABASE_URL if we set it
if [ "$DATABASE_URL" = "postgresql://dummy:dummy@dummy/dummy?sslmode=require" ]; then
  unset DATABASE_URL
fi

echo "Build completed successfully"