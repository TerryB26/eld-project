#!/bin/bash

# ELD Project - Quick Start Script
# This is a simplified version for quick deployment

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 ELD Project Quick Start"
echo "=========================="

# Make setup.sh executable and run it
chmod +x "$PROJECT_DIR/setup.sh"
exec "$PROJECT_DIR/setup.sh"
