# ELD Project - Linux Server Setup Summary

## Quick Start Commands

### Initial Setup
```bash
git clone https://github.com/TerryB26/eld-project.git
cd eld-project
chmod +x setup.sh
./setup.sh
```

### Daily Operations
```bash
# Check status
./status.sh

# View logs
pm2 logs

# Restart services  
pm2 restart ecosystem.config.json

# Update application
./update.sh
```

## What the Setup Script Does

1. **System Dependencies**: Automatically detects your Linux distribution and installs:
   - Python 3.8+
   - Node.js & npm
   - Git, curl, build tools
   - SQLite and development headers

2. **Application Setup**:
   - Creates Python virtual environment
   - Installs all Python dependencies
   - Installs all Node.js dependencies
   - Sets up Django database
   - Builds React frontend
   - Configures PM2 for process management

3. **Service Management**:
   - Starts backend on port 6800
   - Starts frontend on port 1300
   - Configures auto-restart on system reboot

## Application URLs
- Backend API: http://localhost:6800
- Frontend App: http://localhost:1300

## File Structure After Setup
```
eld-project/
├── setup.sh          # Main installation script
├── update.sh          # Update and restart script  
├── status.sh          # Status check script
├── install.sh         # Quick setup alias
├── ecosystem.config.json  # PM2 configuration
├── .venv/             # Python virtual environment
├── logs/              # Application logs
├── backend/           # Django API
└── frontend/          # React app
```

## Troubleshooting

### If setup fails:
1. Check you have sudo privileges
2. Ensure internet connection is stable
3. Verify your Linux distribution is supported (Ubuntu/Debian/CentOS/RHEL/Fedora)

### If services won't start:
```bash
pm2 logs         # Check error logs
pm2 restart all  # Force restart
```

### Manual service start:
```bash
# Backend only
cd backend && ../.venv/bin/python manage.py runserver 0.0.0.0:6800

# Frontend only  
cd frontend && npx serve -s build -l 1300
```
