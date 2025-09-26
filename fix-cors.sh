#!/bin/bash

# ELD Project - Fix CORS Issue
# Updates Django CORS settings to allow cross-origin requests

PROJECT_DIR="/root/B26_Warehouse/eld-project"
VENV_DIR="$PROJECT_DIR/.venv"
SERVER_IP="185.220.204.117"

echo "🔧 Fixing CORS Configuration"
echo "============================"

cd "$PROJECT_DIR"

# Stop backend to update settings
echo "⏹️  Stopping backend..."
pm2 stop eld-backend

# Update .env file with proper CORS settings
echo "📝 Updating .env with CORS configuration..."
cat > .env << EOF
# Django Settings
SECRET_KEY=django-insecure-55skpk3*u@2z5xph+^464&h-ermq2yf7!mrag@@t)(b!20_v(m
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,$SERVER_IP,*

# CORS Settings
FRONTEND_URL=http://$SERVER_IP:1300
CORS_ALLOW_ALL_ORIGINS=True

# Database
DATABASE_URL=sqlite:///db.sqlite3
EOF

echo "✅ Updated .env with CORS settings"

# Update Django settings.py to properly handle CORS
echo "📝 Updating Django CORS settings..."
cd backend/eld_app

# Create backup
cp settings.py settings.py.backup

# Update the CORS section in settings.py
cat > cors_settings.py << EOF
# CORS settings - Allow all origins for development
import os

# Get environment variables
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:1300')
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'

if CORS_ALLOW_ALL_ORIGINS:
    # Allow all origins (for development/testing)
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # Specific allowed origins
    CORS_ALLOWED_ORIGINS = [
        FRONTEND_URL,
        "http://localhost:1300",
        "http://127.0.0.1:1300", 
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://$SERVER_IP:1300",
        "http://$SERVER_IP:3000",
    ]

# Additional CORS settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS', 
    'PATCH',
    'POST',
    'PUT',
]
EOF

# Replace the CORS section in settings.py
python3 << 'PYTHON_SCRIPT'
import re

# Read the current settings.py
with open('settings.py', 'r') as f:
    content = f.read()

# Remove the existing CORS section
pattern = r'# CORS settings.*?CORS_ALLOW_CREDENTIALS = True'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# Read the new CORS settings
with open('cors_settings.py', 'r') as f:
    new_cors = f.read()

# Add the new CORS settings before REST_FRAMEWORK
rest_framework_pos = content.find('# REST Framework settings')
if rest_framework_pos != -1:
    content = content[:rest_framework_pos] + new_cors + '\n\n' + content[rest_framework_pos:]
else:
    # Append at the end if REST_FRAMEWORK section not found
    content += '\n\n' + new_cors

# Write the updated settings
with open('settings.py', 'w') as f:
    f.write(content)

print("✅ Updated settings.py with new CORS configuration")
PYTHON_SCRIPT

# Clean up temporary file
rm cors_settings.py

cd "$PROJECT_DIR"

# Install/ensure django-cors-headers is available
echo "📦 Ensuring django-cors-headers is installed..."
source "$VENV_DIR/bin/activate"
pip install django-cors-headers

# Start backend with new settings
echo "🚀 Starting backend with updated CORS settings..."
pm2 start eld-backend

# Wait for backend to start
sleep 3

echo ""
echo "📊 Backend Status:"
pm2 list | grep backend

echo ""
echo "🔍 Testing CORS headers..."
echo "Testing backend API with curl..."

# Test the API endpoint
curl -H "Origin: http://$SERVER_IP:1300" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: content-type" \
     -X OPTIONS \
     http://localhost:6800/api/drivers/ -v

echo ""
echo ""
echo "🔍 Testing simple GET request..."
curl -s http://localhost:6800/api/drivers/ | head -n 5

echo ""
echo "✅ CORS fix complete!"
echo ""
echo "🌐 Frontend: http://$SERVER_IP:1300" 
echo "🌐 Backend API: http://$SERVER_IP:6800"
echo ""
echo "The frontend should now be able to connect to the backend!"

# Show recent backend logs
echo ""
echo "🔍 Recent backend logs:"
pm2 logs eld-backend --lines 5 --nostream
