#!/bin/bash

# ELD Project Deployment Script
# This script handles the complete deployment process for the ELD application

set -e  # Exit on any error

echo "🚀 Starting ELD Project Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="eld-project"
BACKEND_PORT=6800
FRONTEND_PORT=1300
PYTHON_VERSION="python3"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Consider using a non-root user for deployment."
fi

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

print_status "Project root: $PROJECT_ROOT"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Python
if ! command_exists $PYTHON_VERSION; then
    print_error "Python is not installed. Please install Python first."
    exit 1
fi

# Check pip
if ! command_exists pip3; then
    print_error "pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Check PM2
if ! command_exists pm2; then
    print_warning "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

print_success "System requirements check passed!"

# Navigate to project root
cd "$PROJECT_ROOT"

# Pull latest changes if this is a git repository
if [ -d ".git" ]; then
    print_status "Pulling latest changes from git..."
    git pull origin main || print_warning "Could not pull from git. Continuing with current code."
fi

# Install root dependencies
print_status "Installing root project dependencies..."
npm install

# Setup Python virtual environment
print_status "Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    $PYTHON_VERSION -m venv .venv
    print_success "Created Python virtual environment"
else
    print_status "Python virtual environment already exists"
fi

# Activate virtual environment and install backend dependencies
print_status "Installing backend dependencies..."
source .venv/bin/activate

# Install Python dependencies from requirements.txt
if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    pip install -r "$PROJECT_ROOT/requirements.txt"
else
    # Fallback to manual installation
    pip install django djangorestframework django-cors-headers python-dotenv
fi

# Navigate to backend and run Django setup
cd "$PROJECT_ROOT/backend"
python manage.py collectstatic --noinput || print_warning "Could not collect static files"
python manage.py migrate || print_warning "Could not run migrations"

# Navigate to frontend and install dependencies
cd "$PROJECT_ROOT/frontend"
print_status "Installing frontend dependencies..."
npm install

# Build frontend for production
print_status "Building frontend for production..."
npm run build

# Navigate back to project root
cd "$PROJECT_ROOT"

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop $PROJECT_NAME-backend || true
pm2 stop $PROJECT_NAME-frontend || true
pm2 delete $PROJECT_NAME-backend || true
pm2 delete $PROJECT_NAME-frontend || true

# Start backend with PM2
print_status "Starting backend with PM2..."
pm2 start "$PROJECT_ROOT/.venv/bin/python" \
    --name "$PROJECT_NAME-backend" \
    --cwd "$PROJECT_ROOT/backend" \
    -- manage.py runserver 0.0.0.0:$BACKEND_PORT

# Start frontend with PM2
print_status "Starting frontend with PM2..."
pm2 start npx \
    --name "$PROJECT_NAME-frontend" \
    --cwd "$PROJECT_ROOT/frontend" \
    -- serve -s build -l $FRONTEND_PORT

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup || print_warning "Could not setup PM2 startup script. You may need to run this manually."

print_success "Deployment completed successfully!"
print_status "Backend running on port $BACKEND_PORT"
print_status "Frontend running on port $FRONTEND_PORT"
print_status "Access your application at: http://your-server-ip:$FRONTEND_PORT"

echo ""
print_status "Useful PM2 commands:"
echo "  pm2 status                    - Check status of all processes"
echo "  pm2 logs $PROJECT_NAME-backend   - View backend logs"
echo "  pm2 logs $PROJECT_NAME-frontend  - View frontend logs"
echo "  pm2 restart $PROJECT_NAME-backend - Restart backend"
echo "  pm2 restart $PROJECT_NAME-frontend - Restart frontend"
echo "  pm2 monit                     - Monitor processes"

print_success "🎉 ELD Project is now running with PM2!"
