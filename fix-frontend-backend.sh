#!/bin/bash

# ELD Project - Fix Frontend Backend Connection
# Updates frontend API URLs to use server IP instead of localhost

PROJECT_DIR="/root/B26_Warehouse/eld-project"
SERVER_IP="185.220.204.117"

echo "🔧 Fixing Frontend Backend Connection"
echo "===================================="

cd "$PROJECT_DIR"

# Stop frontend
echo "⏹️  Stopping frontend..."
pm2 stop eld-frontend 2>/dev/null || echo "Frontend was not running"

# Update all frontend files to use server IP instead of localhost
echo "📝 Updating API URLs from localhost to server IP..."

# List of files to update
FILES_TO_UPDATE=(
    "frontend/src/App.js"
    "frontend/src/AddDriverForm.js" 
    "frontend/src/DriverDashboard.js"
    "frontend/src/DutyStatusChanger.js"
    "frontend/src/ELDAlert.js"
)

# Create backups and update files
for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        echo "📁 Updating $file..."
        # Create backup
        cp "$file" "$file.backup"
        # Replace localhost:6800 with server IP:6800
        sed -i "s|http://localhost:6800|http://$SERVER_IP:6800|g" "$file"
        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

# Also update the error message in ELDAlert.js to show correct URL
if [ -f "frontend/src/ELDAlert.js" ]; then
    sed -i "s|http://localhost:6800|http://$SERVER_IP:6800|g" "frontend/src/ELDAlert.js"
fi

echo "✅ All API URLs updated to use $SERVER_IP:6800"

# Rebuild frontend with updated URLs
echo "🏗️  Rebuilding frontend with new API URLs..."
cd frontend
npm run build
cd "$PROJECT_DIR"

if [ -d "frontend/build" ]; then
    echo "✅ Frontend rebuilt successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Start frontend again
echo "🚀 Starting frontend with updated configuration..."
pm2 start eld-frontend 2>/dev/null || {
    # If that fails, try starting with our custom config
    pm2 start frontend-pm2.json 2>/dev/null || {
        # Last resort - direct start
        cd frontend
        pm2 start --name "eld-frontend" -- serve -s build -l 1300
        cd "$PROJECT_DIR"
    }
}

# Wait for services to stabilize
sleep 3

echo ""
echo "📊 Service Status:"
pm2 list

echo ""
echo "🔍 Testing backend connectivity from server..."
if curl -s http://localhost:6800/api/ >/dev/null 2>&1; then
    echo "✅ Backend responding on localhost:6800"
else
    echo "❌ Backend not responding on localhost:6800"
fi

if curl -s http://$SERVER_IP:6800/api/ >/dev/null 2>&1; then
    echo "✅ Backend responding on $SERVER_IP:6800"
else
    echo "❌ Backend not responding on $SERVER_IP:6800"
fi

echo ""
echo "🔍 Testing frontend connectivity..."
if curl -s http://localhost:1300 >/dev/null 2>&1; then
    echo "✅ Frontend responding on localhost:1300"
else
    echo "❌ Frontend not responding on localhost:1300"
fi

echo ""
echo "✅ Fix complete!"
echo "🌐 Frontend: http://$SERVER_IP:1300"
echo "🌐 Backend API: http://$SERVER_IP:6800"
echo ""
echo "The frontend should now connect to the backend correctly!"

# Show recent logs
echo ""
echo "🔍 Recent frontend logs:"
pm2 logs eld-frontend --lines 5 --nostream
