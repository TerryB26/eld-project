#!/bin/bash

# ELD Project - Update and Restart Script
# Use this script to pull latest changes and restart the application

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Updating ELD Project"
echo "======================="

cd "$PROJECT_DIR"

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Activate virtual environment
source .venv/bin/activate

# Update Python dependencies
if [ -f "requirements.txt" ]; then
    echo "🐍 Updating Python dependencies..."
    pip install -r requirements.txt
fi

# Update frontend dependencies and rebuild
if [ -d "frontend" ]; then
    echo "📦 Updating frontend dependencies..."
    cd frontend
    npm install
    echo "🏗️ Building frontend..."
    npm run build
    cd ..
fi

# Run Django migrations
echo "🗃️ Running database migrations..."
cd backend
python manage.py migrate
cd ..

# Restart PM2 services
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.json

echo "✅ Update complete!"
pm2 status
