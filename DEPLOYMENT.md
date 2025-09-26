# ELD Project Deployment Guide

## 🚀 Automated Linux Server Deployment

### Quick Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/TerryB26/eld-project.git
cd eld-project

# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

The setup script automatically:
- Detects your Linux distribution (Ubuntu/Debian/CentOS/RHEL/Fedora)
- Installs all required system dependencies
- Sets up Python virtual environment
- Installs all application dependencies
- Configures the database
- Builds the frontend
- Starts the application with PM2

After setup completion:
- Backend API: http://localhost:6800
- Frontend: http://localhost:1300

### Managing the Application
```bash
# Check application status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart ecosystem.config.json

# Stop services
pm2 stop ecosystem.config.json
```

## 🔧 Manual Hosting Options

### Option 1: Development/Local Network
```bash
# Default ports - accessible on local network
npm run prod
# Backend: http://your-ip:6800
# Frontend: http://your-ip:1300
```

### Option 2: Custom Ports
```bash
# Backend on custom port
cd backend && ../.venv/bin/python manage.py runserver 0.0.0.0:8080

# Frontend on custom port  
cd frontend && npx serve -s build -l 4000
```

### Option 3: Manual Production Setup (if not using setup.sh)

#### Prerequisites
```bash
# Install dependencies (example for Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-venv nodejs npm nginx pm2

# Clone project
git clone https://github.com/TerryB26/eld-project.git
cd eld-project
```

#### Setup
```bash
# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install django djangorestframework django-cors-headers

# Install frontend dependencies
npm run setup
npm run build
```

#### Environment Configuration
```bash
# Copy and edit environment file
cp .env.example .env.production
nano .env.production
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/eld-project
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/eld-project/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Systemd Services
```ini
# /etc/systemd/system/eld-backend.service
[Unit]
Description=ELD Django Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/eld-project/backend
Environment=PATH=/path/to/eld-project/.venv/bin
ExecStart=/path/to/eld-project/.venv/bin/python manage.py runserver 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Start Services
```bash
# Enable and start services
sudo systemctl enable eld-backend
sudo systemctl start eld-backend
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### Option 4: Docker Deployment

#### Create Dockerfile (Backend)
```dockerfile
# backend/Dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

#### Create Dockerfile (Frontend)
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - ALLOWED_HOSTS=localhost,127.0.0.1

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

## 🔧 Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| DEBUG | True | False |
| ALLOWED_HOSTS | localhost,127.0.0.1 | your-domain.com |
| FRONTEND_URL | http://localhost:3000 | https://your-domain.com |

## 📋 Production Checklist

- [ ] Set DEBUG=False
- [ ] Configure proper ALLOWED_HOSTS
- [ ] Use strong SECRET_KEY
- [ ] Setup HTTPS/SSL
- [ ] Configure database (PostgreSQL recommended)
- [ ] Setup static file serving
- [ ] Configure email settings
- [ ] Setup monitoring/logging
- [ ] Configure backups
- [ ] Test all endpoints

## 🌐 Port Configuration

### Default Ports
- **Backend**: 8000
- **Frontend**: 3000

### Custom Ports
Update these files when changing ports:
- `package.json` scripts
- `backend/eld_app/settings.py` CORS settings
- Frontend API calls in `src/` files
- Nginx configuration (if using)

## 🔍 Testing Deployment

```bash
# Test backend
curl http://your-domain:8000/api/drivers/

# Test frontend
curl http://your-domain:3000

# Check CORS
curl -H "Origin: http://your-domain:3000" http://your-domain:8000/api/drivers/
```
