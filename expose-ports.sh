#!/bin/bash

# ELD Project - Port Exposure Script
# Opens firewall ports for external access

echo "🔓 Exposing ELD Application Ports"
echo "================================="

# Check if UFW is available
if command -v ufw >/dev/null 2>&1; then
    echo "📡 Configuring UFW firewall..."
    
    # Enable UFW if not already enabled
    ufw --force enable
    
    # Allow SSH (important - don't lock yourself out!)
    ufw allow 22/tcp
    echo "✅ SSH port 22 allowed"
    
    # Allow ELD backend port
    ufw allow 6800/tcp
    echo "✅ Backend port 6800 allowed"
    
    # Allow ELD frontend port  
    ufw allow 1300/tcp
    echo "✅ Frontend port 1300 allowed"
    
    # Show UFW status
    echo ""
    echo "🔒 UFW Firewall Status:"
    ufw status numbered
    
elif command -v iptables >/dev/null 2>&1; then
    echo "📡 Configuring iptables..."
    
    # Allow SSH
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    echo "✅ SSH port 22 allowed"
    
    # Allow ELD ports
    iptables -A INPUT -p tcp --dport 6800 -j ACCEPT
    iptables -A INPUT -p tcp --dport 1300 -j ACCEPT
    echo "✅ ELD ports 6800 and 1300 allowed"
    
    # Allow established connections
    iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    
    # Save iptables rules (distribution dependent)
    if command -v iptables-save >/dev/null 2>&1; then
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
        iptables-save > /etc/sysconfig/iptables 2>/dev/null
        echo "✅ iptables rules saved"
    fi
    
else
    echo "⚠️  No firewall management tool found (ufw/iptables)"
    echo "You may need to configure your firewall manually"
fi

# Check if ports are listening
echo ""
echo "🔍 Checking if ports are listening..."
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep -E ':(6800|1300) '
elif command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep -E ':(6800|1300) '
else
    echo "Install netstat or ss to verify port status"
fi

echo ""
echo "🌐 External Access URLs:"
echo "   Backend API: http://YOUR_SERVER_IP:6800"
echo "   Frontend App: http://YOUR_SERVER_IP:1300"
echo ""
echo "💡 Replace YOUR_SERVER_IP with your actual server IP address"
echo "   To find your IP: curl -s ifconfig.me"

# Get server IP
if command -v curl >/dev/null 2>&1; then
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null)
    if [ -n "$SERVER_IP" ]; then
        echo ""
        echo "🎯 Your server IP appears to be: $SERVER_IP"
        echo "   Backend: http://$SERVER_IP:6800"
        echo "   Frontend: http://$SERVER_IP:1300"
    fi
fi

echo ""
echo "✅ Port exposure complete!"
