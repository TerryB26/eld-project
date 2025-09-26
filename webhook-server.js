#!/usr/bin/env node

// Simple webhook server for ELD Project auto-deployment
// This creates an HTTP server that listens for GitHub webhooks

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PORT = process.env.WEBHOOK_PORT || 9000;
const PROJECT_DIR = __dirname; // Current directory where this script is located
const WEBHOOK_PATH = '/webhook';
const LOG_FILE = path.join(PROJECT_DIR, 'logs', 'webhook-server.log');

// Ensure logs directory exists
const logsDir = path.join(PROJECT_DIR, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    console.log(logMessage.trim());
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, logMessage);
}

// Execute deployment script
function deployProject() {
    return new Promise((resolve, reject) => {
        log('🚀 Starting deployment...');
        
        const deployScript = path.join(PROJECT_DIR, 'webhook.sh');
        
        // Check if webhook.sh exists
        if (!fs.existsSync(deployScript)) {
            const error = 'webhook.sh not found in project directory';
            log(`❌ ERROR: ${error}`);
            reject(new Error(error));
            return;
        }
        
        // Make script executable and run it
        exec(`chmod +x "${deployScript}" && "${deployScript}"`, {
            cwd: PROJECT_DIR,
            timeout: 300000 // 5 minute timeout
        }, (error, stdout, stderr) => {
            if (error) {
                log(`❌ Deployment failed: ${error.message}`);
                log(`stderr: ${stderr}`);
                reject(error);
            } else {
                log('✅ Deployment completed successfully');
                log(`stdout: ${stdout}`);
                resolve(stdout);
            }
        });
    });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Log all requests
    log(`${req.method} ${req.url} from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);
    
    // Handle webhook endpoint
    if (req.method === 'POST' && url.pathname === WEBHOOK_PATH) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                // Parse webhook payload
                const payload = JSON.parse(body);
                
                log(`📨 Webhook received from ${payload.repository?.full_name || 'unknown'}`);
                log(`🌿 Branch: ${payload.ref || 'unknown'}`);
                log(`👤 Pusher: ${payload.pusher?.name || 'unknown'}`);
                
                // Only deploy on push to main branch
                if (payload.ref === 'refs/heads/main') {
                    log('✓ Push to main branch detected - starting deployment');
                    
                    try {
                        await deployProject();
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Deployment started successfully',
                            timestamp: new Date().toISOString()
                        }));
                    } catch (deployError) {
                        log(`❌ Deployment error: ${deployError.message}`);
                        
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: false,
                            error: deployError.message,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } else {
                    log(`⏭️  Skipping deployment - not main branch (${payload.ref})`);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Webhook received but not main branch - no deployment',
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (parseError) {
                log(`❌ Invalid JSON payload: ${parseError.message}`);
                
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Invalid JSON payload',
                    timestamp: new Date().toISOString()
                }));
            }
        });
    } 
    // Health check endpoint
    else if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            project: 'ELD Auto-Deploy Webhook',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    }
    // Default response for other requests
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Not Found',
            message: 'Use POST /webhook for GitHub webhooks or GET /health for status',
            timestamp: new Date().toISOString()
        }));
    }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    log(`🚀 ELD Webhook server started on port ${PORT}`);
    log(`📡 Webhook URL: http://your-server-ip:${PORT}${WEBHOOK_PATH}`);
    log(`🏥 Health check: http://your-server-ip:${PORT}/health`);
    log(`📁 Project directory: ${PROJECT_DIR}`);
    log(`📝 Logs: ${LOG_FILE}`);
});

// Handle server errors
server.on('error', (error) => {
    log(`❌ Server error: ${error.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('📡 Webhook server shutting down...');
    server.close(() => {
        log('✅ Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    log('📡 Webhook server received SIGTERM...');
    server.close(() => {
        log('✅ Server stopped');
        process.exit(0);
    });
});
