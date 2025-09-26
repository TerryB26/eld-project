#!/bin/bash

# ELD Project - Root User Setup Script
# Simplified version for root users

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"

echo "🚀 ELD Project Setup (Root Mode)"
echo "================================"

# Install system dependencies
echo "📦 Installing system dependencies..."
apt update
apt install -y python3 python3-pip python3-venv python3-dev nodejs npm git curl build-essential sqlite3 libsqlite3-dev

# Install PM2
echo "⚙️ Installing PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
fi

# Setup Python virtual environment
echo "🐍 Setting up Python environment..."
cd "$PROJECT_DIR"
rm -rf "$VENV_DIR"
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip

# Install dependencies
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    pip install django djangorestframework django-cors-headers
fi

# Install Node dependencies
echo "📦 Installing Node.js dependencies..."
npm install
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
fi

# Setup directories
mkdir -p logs

# Update ecosystem config for Linux
if [ -f "ecosystem.config.json" ]; then
    cp ecosystem.config.json ecosystem.config.json.backup
    sed -i 's|"../.venv/Scripts/python.exe"|"../.venv/bin/python"|g' ecosystem.config.json
fi

# Setup Django
echo "🗃️ Setting up Django backend..."
cd backend
source "$VENV_DIR/bin/activate"
python manage.py makemigrations
python manage.py migrate
cd ..

# Build frontend
if [ -d "frontend" ]; then
    echo "🏗️ Building frontend..."
    cd frontend
    npm run build
    cd ..
fi

# Start with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.json
pm2 save

echo "✅ Setup complete!"
echo "Backend: http://localhost:6800"
echo "Frontend: http://localhost:1300"
pm2 status
