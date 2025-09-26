#!/bin/bash

# ELD Project - Complete Setup Script for Linux Server
# This script installs all dependencies and sets up the ELD application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the project directory (where this script is located)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install system dependencies
install_system_dependencies() {
    log_header "Installing System Dependencies"
    
    # Detect Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    else
        log_error "Cannot detect Linux distribution"
        exit 1
    fi
    
    log_info "Detected distribution: $DISTRO"
    
    case $DISTRO in
        ubuntu|debian)
            log_info "Updating package list..."
            if [ "$EUID" -eq 0 ]; then
                apt update
            else
                sudo apt update
            fi
            
            log_info "Installing system packages..."
            if [ "$EUID" -eq 0 ]; then
                apt install -y \
                    python3 \
                    python3-pip \
                    python3-venv \
                    python3-dev \
                    nodejs \
                    npm \
                    git \
                    curl \
                    build-essential \
                    sqlite3 \
                    libsqlite3-dev
            else
                sudo apt install -y \
                    python3 \
                    python3-pip \
                    python3-venv \
                    python3-dev \
                    nodejs \
                    npm \
                    git \
                    curl \
                    build-essential \
                    sqlite3 \
                    libsqlite3-dev
            fi
            ;;
        centos|rhel|fedora)
            if command_exists dnf; then
                PKG_MANAGER="dnf"
            elif command_exists yum; then
                PKG_MANAGER="yum"
            else
                log_error "No package manager found"
                exit 1
            fi
            
            log_info "Installing system packages..."
            if [ "$EUID" -eq 0 ]; then
                $PKG_MANAGER install -y \
                    python3 \
                    python3-pip \
                    python3-venv \
                    python3-devel \
                    nodejs \
                    npm \
                    git \
                    curl \
                    gcc \
                    gcc-c++ \
                    make \
                    sqlite \
                    sqlite-devel
            else
                sudo $PKG_MANAGER install -y \
                    python3 \
                    python3-pip \
                    python3-venv \
                    python3-devel \
                    nodejs \
                    npm \
                    git \
                    curl \
                    gcc \
                    gcc-c++ \
                    make \
                    sqlite \
                    sqlite-devel
            fi
            ;;
        *)
            log_error "Unsupported distribution: $DISTRO"
            log_info "Please install the following packages manually:"
            log_info "- python3, python3-pip, python3-venv"
            log_info "- nodejs, npm"
            log_info "- git, curl, build tools"
            log_info "- sqlite3 and development headers"
            read -p "Press Enter to continue after installing these packages..."
            ;;
    esac
    
    log_success "System dependencies installed"
}

# Check and install Node.js if needed
check_nodejs() {
    log_header "Checking Node.js Installation"
    
    if ! command_exists node; then
        log_warning "Node.js not found. Installing Node.js..."
        
        # Install Node.js using NodeSource repository (works on most Linux distros)
        if [ "$EUID" -eq 0 ]; then
            curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
            apt-get install -y nodejs || {
                log_error "Failed to install Node.js via package manager"
                log_info "Please install Node.js manually from https://nodejs.org/"
                exit 1
            }
        else
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs || {
                log_error "Failed to install Node.js via package manager"
                log_info "Please install Node.js manually from https://nodejs.org/"
                exit 1
            }
        fi
    fi
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_success "Node.js version: $NODE_VERSION"
    log_success "npm version: $NPM_VERSION"
}

# Install PM2 globally if not present
install_pm2() {
    log_header "Installing PM2"
    
    if ! command_exists pm2; then
        log_info "Installing PM2 globally..."
        if [ "$EUID" -eq 0 ]; then
            npm install -g pm2
        else
            sudo npm install -g pm2
        fi
        log_success "PM2 installed"
    else
        log_success "PM2 is already installed"
    fi
    
    PM2_VERSION=$(pm2 --version)
    log_success "PM2 version: $PM2_VERSION"
}

# Setup Python virtual environment
setup_python_environment() {
    log_header "Setting Up Python Virtual Environment"
    
    cd "$PROJECT_DIR"
    
    # Remove existing virtual environment if it exists
    if [ -d "$VENV_DIR" ]; then
        log_warning "Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
    fi
    
    # Create new virtual environment
    log_info "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Upgrade pip
    log_info "Upgrading pip..."
    pip install --upgrade pip
    
    # Install Python dependencies
    if [ -f "requirements.txt" ]; then
        log_info "Installing Python dependencies from requirements.txt..."
        pip install -r requirements.txt
    else
        log_info "Installing Django and common dependencies..."
        pip install django djangorestframework django-cors-headers
    fi
    
    log_success "Python environment setup complete"
}

# Install Node.js dependencies
install_node_dependencies() {
    log_header "Installing Node.js Dependencies"
    
    cd "$PROJECT_DIR"
    
    # Install root package dependencies
    if [ -f "package.json" ]; then
        log_info "Installing root project dependencies..."
        npm install
        log_success "Root dependencies installed"
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        log_info "Installing frontend dependencies..."
        cd "$PROJECT_DIR/frontend"
        npm install
        log_success "Frontend dependencies installed"
    fi
    
    cd "$PROJECT_DIR"
}

# Setup Django backend
setup_backend() {
    log_header "Setting Up Django Backend"
    
    cd "$PROJECT_DIR/backend"
    
    # Activate virtual environment
    source "$VENV_DIR/bin/activate"
    
    # Run Django migrations
    log_info "Running Django migrations..."
    python manage.py makemigrations
    python manage.py migrate
    
    # Create superuser (optional)
    log_info "Would you like to create a Django superuser? (y/n)"
    read -r create_superuser
    if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
        python manage.py createsuperuser
    fi
    
    log_success "Django backend setup complete"
    
    cd "$PROJECT_DIR"
}

# Build frontend
build_frontend() {
    log_header "Building Frontend"
    
    if [ -d "frontend" ]; then
        cd "$PROJECT_DIR/frontend"
        
        log_info "Building React frontend..."
        npm run build
        
        log_success "Frontend build complete"
        cd "$PROJECT_DIR"
    else
        log_warning "Frontend directory not found, skipping frontend build"
    fi
}

# Create logs directory
setup_logs() {
    log_header "Setting Up Logs Directory"
    
    mkdir -p "$PROJECT_DIR/logs"
    log_success "Logs directory created"
}

# Update ecosystem.config.json for Linux
update_ecosystem_config() {
    log_header "Updating PM2 Configuration"
    
    # Update the Python interpreter path in ecosystem.config.json for Linux
    if [ -f "ecosystem.config.json" ]; then
        log_info "Updating ecosystem.config.json with absolute Python path..."
        
        # Create a backup
        cp ecosystem.config.json ecosystem.config.json.backup
        
        # Use absolute path to avoid PM2 PATH issues
        PYTHON_ABSOLUTE_PATH="$VENV_DIR/bin/python"
        sed -i "s|\"../.venv/Scripts/python.exe\"|\"$PYTHON_ABSOLUTE_PATH\"|g" ecosystem.config.json
        sed -i "s|\"../.venv/bin/python\"|\"$PYTHON_ABSOLUTE_PATH\"|g" ecosystem.config.json
        
        log_success "Ecosystem config updated with absolute path: $PYTHON_ABSOLUTE_PATH"
    fi
}

# Start the application
start_application() {
    log_header "Starting Application"
    
    cd "$PROJECT_DIR"
    
    log_info "Starting application with PM2..."
    pm2 start ecosystem.config.json
    
    log_info "Saving PM2 process list..."
    pm2 save
    
    log_info "Setting up PM2 to start on system boot..."
    pm2 startup
    
    log_success "Application started successfully!"
    
    # Show status
    pm2 status
    
    log_header "Application URLs"
    log_info "Backend API: http://localhost:6800"
    log_info "Frontend: http://localhost:1300"
    log_info "PM2 Monitor: pm2 monit"
}

# Main installation function
main() {
    log_header "ELD Project - Linux Server Setup"
    log_info "Project directory: $PROJECT_DIR"
    log_info "Starting installation process..."
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root detected!"
        log_info "It's recommended to run this script as a non-root user for security."
        log_info ""
        log_info "Options:"
        log_info "1. Continue as root (not recommended for production)"
        log_info "2. Create a new user and run the script as that user"
        log_info ""
        log_info "To create a new user, run these commands in another terminal:"
        log_info "  adduser eld-user"
        log_info "  usermod -aG sudo eld-user"
        log_info "  su - eld-user"
        log_info "  cd /root/B26_Warehouse/eld-project"
        log_info "  ./setup.sh"
        log_info ""
        read -p "Continue as root? (y/N): " -r continue_as_root
        if [[ ! $continue_as_root =~ ^[Yy]$ ]]; then
            log_info "Setup cancelled. Please run as non-root user."
            exit 1
        fi
        log_warning "Continuing as root - this is not recommended for production servers!"
    fi
    
    # Install system dependencies
    install_system_dependencies
    
    # Check Node.js
    check_nodejs
    
    # Install PM2
    install_pm2
    
    # Setup Python environment
    setup_python_environment
    
    # Install Node dependencies
    install_node_dependencies
    
    # Setup logs
    setup_logs
    
    # Update ecosystem config
    update_ecosystem_config
    
    # Setup Django backend
    setup_backend
    
    # Build frontend
    build_frontend
    
    # Start application
    start_application
    
    log_header "Installation Complete!"
    log_success "Your ELD application is now running on your Linux server"
    log_info "Use 'pm2 status' to check application status"
    log_info "Use 'pm2 logs' to view application logs"
    log_info "Use 'pm2 restart ecosystem.config.json' to restart all services"
}

# Run main function
main "$@"
