#!/usr/bin/env bash
set -e

echo "====================================="
echo "🚀 Starting Pre-Flight Checks..."
echo "====================================="
python -m scripts.pre_start

echo "====================================="
echo "🏗️ Running Database Migrations..."
echo "====================================="
alembic upgrade head

echo "====================================="
echo "🌐 Starting Web Server..."
echo "====================================="
# Render dynamic port binding. Defaults to 8000 for local dev if PORT is not set.
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
