#!/bin/bash

# GitHub Webhook Handler for ELD Project
# This script is designed to be called by GitHub webhooks for automatic deployment

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"  # Use current directory
LOG_FILE="$PROJECT_DIR/logs/webhook.log"  # Use project logs directory
GITHUB_SECRET=""  # No secret required

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# Validate webhook (optional - no secret validation)
validate_webhook() {
    log_info "Webhook validation: No secret configured (open webhook)"
    log_warning "For production, consider adding webhook secret validation"
}

# Main deployment function
deploy() {
    log_info "🚀 Starting automatic deployment..."
    log_info "Project directory: $PROJECT_DIR"
    
    # Ensure logs directory exists
    mkdir -p "$PROJECT_DIR/logs"
    
    # Validate webhook
    validate_webhook
    
    # Change to project directory
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Project directory does not exist: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Pull latest changes
    log_info "Pulling latest changes from repository..."
    git fetch origin
    git reset --hard origin/main
    
    # Run deployment script
    log_info "Running deployment script..."
    if [ -f "./deploy.sh" ]; then
        chmod +x ./deploy.sh
        ./deploy.sh
        log_success "Deployment completed successfully!"
    else
        log_error "deploy.sh not found in project directory"
        exit 1
    fi
    
    # Send notification (optional)
    send_notification "ELD Project deployed successfully at $(date)"
}

# Send notification function (customize as needed)
send_notification() {
    local message="$1"
    # Add your notification logic here (email, Slack, Discord, etc.)
    log_info "Notification: $message"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Deployment failed with exit code: $exit_code"
    send_notification "ELD Project deployment failed at $(date)"
    exit $exit_code
}

# Set up error handling
trap handle_error ERR

# Main execution
if [ "$1" = "deploy" ]; then
    deploy
else
    log_info "Webhook received - triggering deployment"
    deploy
fi

log_success "Webhook handler completed successfully!"
