# ELD Project - Production Deployment Guide

## Prerequisites

### System Requirements
- Linux server (Ubuntu 18.04+ recommended)
- Node.js 16+ and npm
- Python 3.8+
- Git
- PM2 (will be installed automatically)

### Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install Git
sudo apt install git -y

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

## Deployment Methods

### Method 1: Manual Deployment

1. **Clone the repository:**
```bash
git clone https://github.com/TerryB26/eld-project.git
cd eld-project
```

2. **Make deployment script executable:**
```bash
chmod +x deploy.sh
```

3. **Run deployment:**
```bash
./deploy.sh
```

### Method 2: PM2 Ecosystem File

1. **Use the ecosystem configuration:**
```bash
# Create logs directory
mkdir -p logs

# Start with ecosystem file
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Method 3: Webhook Deployment

1. **Setup webhook handler:**
```bash
# Make webhook script executable
chmod +x webhook.sh

# Edit webhook.sh to set your project path
nano webhook.sh
# Update PROJECT_DIR="/path/to/your/eld-project"
```

2. **Setup webhook endpoint (using Express.js):**
```bash
# Install webhook server globally
npm install -g webhook-server

# Create webhook configuration
cat > webhook-config.json << EOF
{
  "port": 9000,
  "hooks": {
    "eld-deploy": {
      "command": "/path/to/your/eld-project/webhook.sh",
      "trigger": "github"
    }
  }
}
EOF

# Start webhook server with PM2
pm2 start webhook-server --name "eld-webhook" -- --config webhook-config.json
```

3. **Configure GitHub webhook:**
   - Go to your GitHub repository settings
   - Navigate to "Webhooks" section
   - Add webhook with URL: `http://your-server-ip:9000/hooks/eld-deploy`
   - Select "Just the push event"
   - Set content type to "application/json"

## Nginx Configuration (Recommended)

Create Nginx configuration for reverse proxy:

```bash
sudo nano /etc/nginx/sites-available/eld-project
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend
    location / {
        proxy_pass http://localhost:1300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:6800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/eld-project /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Environment Variables

Create a `.env` file in the project root:

```bash
# Django Settings
DEBUG=False
ALLOWED_HOSTS=your-domain.com,your-server-ip
SECRET_KEY=your-secret-key-here

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///db.sqlite3

# CORS Settings
CORS_ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already setup by certbot)
sudo certbot renew --dry-run
```

## Useful PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs eld-backend
pm2 logs eld-frontend

# Restart services
pm2 restart eld-backend
pm2 restart eld-frontend

# Stop services
pm2 stop all

# Monitor processes
pm2 monit

# Update PM2
pm2 update
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if not already allowed)
sudo ufw allow 22

# Allow application ports (if not using Nginx)
sudo ufw allow 1300
sudo ufw allow 6800

# Enable firewall
sudo ufw enable
```

## Monitoring and Logs

### Log Locations
- Application logs: `./logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/`

### PM2 Monitoring
```bash
# Install PM2 web monitor (optional)
pm2 install pm2-server-monit

# Or use external monitoring
pm2 install pm2-logrotate
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
```bash
sudo netstat -tulpn | grep :1300
sudo netstat -tulpn | grep :6800
```

2. **Python virtual environment issues:**
```bash
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # if you have one
```

3. **Permission issues:**
```bash
sudo chown -R $USER:$USER /path/to/eld-project
chmod +x deploy.sh webhook.sh
```

4. **Database issues:**
```bash
cd backend
source ../.venv/bin/activate
python manage.py migrate
python manage.py createsuperuser  # if needed
```

## Security Considerations

1. **Use environment variables for secrets**
2. **Setup fail2ban for SSH protection**
3. **Regular system updates**
4. **Use HTTPS in production**
5. **Setup database backups**
6. **Monitor logs for suspicious activity**

## Backup Strategy

```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/backups/eld-project-$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=.venv \
    --exclude=__pycache__ \
    /path/to/eld-project
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```
