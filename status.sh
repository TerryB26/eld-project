#!/bin/bash

# ELD Project - Status Check Script
# Quick status overview of the ELD application

echo "📊 ELD Project Status"
echo "===================="

# Check if PM2 is running
if command -v pm2 >/dev/null 2>&1; then
    echo "🟢 PM2 Status:"
    pm2 status
    echo ""
    
    echo "📈 PM2 Memory Usage:"
    pm2 monit --no-colors | head -20
    echo ""
else
    echo "❌ PM2 not found or not installed"
fi

# Check if services are responding
echo "🔌 Service Health Check:"

# Check backend
if curl -s http://localhost:6800 >/dev/null 2>&1; then
    echo "✅ Backend (port 6800): ONLINE"
else
    echo "❌ Backend (port 6800): OFFLINE"
fi

# Check frontend
if curl -s http://localhost:1300 >/dev/null 2>&1; then
    echo "✅ Frontend (port 1300): ONLINE"
else
    echo "❌ Frontend (port 1300): OFFLINE"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Backend API: http://localhost:6800"
echo "   Frontend App: http://localhost:1300"
