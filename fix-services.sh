#!/bin/bash

# ELD Project - Fix Backend and Frontend Issues
# Fixes DisallowedHost error and frontend startup issues

PROJECT_DIR="/root/B26_Warehouse/eld-project"
VENV_DIR="$PROJECT_DIR/.venv"

echo "🔧 Fixing ELD Backend and Frontend Issues"
echo "=========================================="

cd "$PROJECT_DIR"

# Stop current PM2 processes
echo "⏹️  Stopping PM2 processes..."
pm2 stop all

# Fix 1: Create .env file with proper ALLOWED_HOSTS
echo "📝 Creating .env file with proper ALLOWED_HOSTS..."
cat > .env << EOF
# Django Settings
SECRET_KEY=django-insecure-55skpk3*u@2z5xph+^464&h-ermq2yf7!mrag@@t)(b!20_v(m
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,185.220.204.117,*

# Database
DATABASE_URL=sqlite:///db.sqlite3

# CORS Settings
CORS_ALLOW_ALL_ORIGINS=True
EOF

echo "✅ Created .env with ALLOWED_HOSTS including your server IP"

# Fix 2: Install python-dotenv if missing
echo "🐍 Ensuring python-dotenv is installed..."
source "$VENV_DIR/bin/activate"
pip install python-dotenv

# Fix 3: Check and rebuild frontend
echo "🏗️  Checking frontend build..."
if [ ! -d "frontend/build" ]; then
    echo "❌ Frontend build directory missing. Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    echo "✅ Frontend rebuilt successfully"
else
    echo "✅ Frontend build directory exists"
fi

# Fix 4: Update ecosystem.config.json with better frontend configuration
echo "📝 Updating PM2 configuration..."
cp ecosystem.config.json ecosystem.config.json.backup

# Create new ecosystem config with fixes
cat > ecosystem.config.json << EOF
{
  "apps": [
    {
      "name": "eld-backend",
      "cwd": "./backend",
      "script": "manage.py",
      "args": "runserver 0.0.0.0:6800",
      "interpreter": "$VENV_DIR/bin/python",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "max_memory_restart": "1G",
      "env": {
        "NODE_ENV": "production",
        "DJANGO_SETTINGS_MODULE": "eld_app.settings"
      },
      "error_file": "./logs/backend-error.log",
      "out_file": "./logs/backend-out.log",
      "log_file": "./logs/backend-combined.log",
      "time": true
    },
    {
      "name": "eld-frontend",
      "cwd": "./frontend",
      "script": "/usr/bin/npx",
      "args": "serve -s build -l 1300 -n",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "max_memory_restart": "512M",
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "./logs/frontend-error.log",
      "out_file": "./logs/frontend-out.log",
      "log_file": "./logs/frontend-combined.log",
      "time": true
    }
  ]
}
EOF

echo "✅ Updated ecosystem.config.json"

# Fix 5: Install serve globally if missing
echo "📦 Ensuring serve package is available..."
if ! npm list -g serve &>/dev/null; then
    npm install -g serve
    echo "✅ Installed serve globally"
fi

# Fix 6: Ensure logs directory exists
mkdir -p logs

# Restart services
echo "🚀 Starting services with fixes..."
pm2 start ecosystem.config.json

# Wait a moment for services to start
sleep 3

echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "🔍 Recent Backend Logs:"
pm2 logs eld-backend --lines 10 --nostream

echo ""
echo "🔍 Recent Frontend Logs:"  
pm2 logs eld-frontend --lines 10 --nostream

echo ""
echo "✅ Fix attempt complete!"
echo "Backend: http://185.220.204.117:6800"
echo "Frontend: http://185.220.204.117:1300"

# Test if services are responding
echo ""
echo "🔌 Testing service connectivity..."
sleep 2

if curl -s http://localhost:6800 >/dev/null 2>&1; then
    echo "✅ Backend responding on port 6800"
else
    echo "❌ Backend not responding on port 6800"
fi

if curl -s http://localhost:1300 >/dev/null 2>&1; then
    echo "✅ Frontend responding on port 1300"
else
    echo "❌ Frontend not responding on port 1300"
fi
