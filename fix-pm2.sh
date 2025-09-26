#!/bin/bash

# Quick fix for PM2 interpreter path error
# Run this to fix the current ecosystem.config.json and restart PM2

PROJECT_DIR="/root/B26_Warehouse/eld-project"
VENV_DIR="$PROJECT_DIR/.venv"
PYTHON_ABSOLUTE_PATH="$VENV_DIR/bin/python"

echo "🔧 Fixing PM2 interpreter path..."

cd "$PROJECT_DIR"

# Stop current PM2 processes
echo "⏹️  Stopping PM2 processes..."
pm2 stop all

# Update ecosystem config with absolute path
echo "📝 Updating ecosystem.config.json..."
cp ecosystem.config.json ecosystem.config.json.backup
sed -i "s|\"../.venv/bin/python\"|\"$PYTHON_ABSOLUTE_PATH\"|g" ecosystem.config.json

echo "✅ Updated Python path to: $PYTHON_ABSOLUTE_PATH"

# Verify the path exists
if [ -f "$PYTHON_ABSOLUTE_PATH" ]; then
    echo "✅ Python executable found at: $PYTHON_ABSOLUTE_PATH"
else
    echo "❌ Python executable not found at: $PYTHON_ABSOLUTE_PATH"
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Restart PM2 with updated config
echo "🚀 Starting PM2 with updated config..."
pm2 start ecosystem.config.json

echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ Fix complete!"
echo "Backend: http://localhost:6800"
echo "Frontend: http://localhost:1300"
