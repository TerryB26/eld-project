#!/bin/bash

# ELD Project - Frontend Fix Script
# Specifically fixes frontend startup issues

PROJECT_DIR="/root/B26_Warehouse/eld-project"

echo "🔧 Fixing Frontend Issues"
echo "========================="

cd "$PROJECT_DIR"

# Stop only frontend process
echo "⏹️  Stopping frontend process..."
pm2 stop eld-frontend 2>/dev/null || echo "Frontend was not running"

# Check if serve is installed globally
echo "📦 Checking serve package..."
if ! command -v serve >/dev/null 2>&1; then
    echo "Installing serve globally..."
    npm install -g serve
    echo "✅ Serve installed globally"
else
    echo "✅ Serve is available"
fi

# Check frontend build directory
echo "🏗️  Checking frontend build..."
if [ ! -d "frontend/build" ]; then
    echo "❌ Build directory missing. Building frontend..."
    cd frontend
    
    # Ensure frontend dependencies are installed
    echo "📦 Installing frontend dependencies..."
    npm install
    
    # Build the frontend
    echo "🏗️  Building React app..."
    npm run build
    
    cd "$PROJECT_DIR"
    
    if [ -d "frontend/build" ]; then
        echo "✅ Frontend built successfully"
    else
        echo "❌ Frontend build failed"
        exit 1
    fi
else
    echo "✅ Frontend build directory exists"
    echo "📁 Build contents:"
    ls -la frontend/build/
fi

# Test serve command manually first
echo "🧪 Testing serve command..."
cd frontend
timeout 5 serve -s build -l 1300 -n &
SERVE_PID=$!
sleep 2

if kill -0 $SERVE_PID 2>/dev/null; then
    echo "✅ Serve command works"
    kill $SERVE_PID 2>/dev/null
else
    echo "❌ Serve command failed"
fi

cd "$PROJECT_DIR"

# Update just the frontend part of ecosystem.config.json
echo "📝 Updating frontend PM2 configuration..."

# Get the full path to serve
SERVE_PATH=$(which serve)
if [ -z "$SERVE_PATH" ]; then
    SERVE_PATH="/usr/local/bin/serve"
fi

# Create a temporary config file for frontend only
cat > frontend-pm2.json << EOF
{
  "apps": [
    {
      "name": "eld-frontend",
      "cwd": "./frontend",
      "script": "$SERVE_PATH",
      "args": ["-s", "build", "-l", "1300", "-n"],
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

# Start frontend with the new config
echo "🚀 Starting frontend with updated configuration..."
pm2 start frontend-pm2.json

# Wait and check status
sleep 3

echo ""
echo "📊 Frontend Status:"
pm2 list | grep frontend

echo ""
echo "🔍 Recent Frontend Logs:"
pm2 logs eld-frontend --lines 10 --nostream

echo ""
echo "🔌 Testing frontend connectivity..."
if curl -s http://localhost:1300 >/dev/null 2>&1; then
    echo "✅ Frontend responding on port 1300"
    echo "🌐 Frontend available at: http://185.220.204.117:1300"
else
    echo "❌ Frontend not responding on port 1300"
    echo "Let's try a different approach..."
    
    # Alternative: try running serve directly
    echo "🔄 Trying alternative serve method..."
    pm2 stop eld-frontend
    
    cd frontend
    pm2 start --name "eld-frontend-alt" --cwd "$(pwd)" -- serve -s build -l 1300
    cd "$PROJECT_DIR"
fi

echo ""
echo "✅ Frontend fix attempt complete!"
