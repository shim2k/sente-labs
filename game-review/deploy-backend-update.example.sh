#!/bin/bash

# AOE4 Review App - Backend Update Deployment Script (EXAMPLE)
# Copy this file to deploy-backend-update.sh and update with your actual values
# Usage: ./deploy-backend-update.sh

set -e

echo "🚀 Starting Backend Update Deployment"

# Configuration - UPDATE THESE VALUES
EC2_HOST="your-ec2-instance.compute-1.amazonaws.com"
KEY_FILE="./your-ssh-key.pem"
DEPLOY_PATH="/opt/aoe4-review"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file $KEY_FILE not found!"
    exit 1
fi

# Check if we're in the server directory or project root
if [ ! -d "server" ]; then
    echo "❌ Error: Must run from project root directory (where server/ folder exists)"
    exit 1
fi

echo "📦 Building backend for production..."
cd server

# Build TypeScript
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf ../backend-update.tar.gz \
    package.json \
    dist/ \
    src/db/schema.sql

cd ..

echo "📤 Uploading to EC2: $EC2_HOST"
scp -i "$KEY_FILE" backend-update.tar.gz ec2-user@"$EC2_HOST":/tmp/

echo "🔧 Updating backend on EC2..."
ssh -i "$KEY_FILE" ec2-user@"$EC2_HOST" << 'EOF'
set -e

echo "⏸️  Stopping services..."
pm2 stop aoe4-api aoe4-worker || true

echo "📦 Extracting new version..."
cd /opt/aoe4-review
tar -xzf /tmp/backend-update.tar.gz

echo "📚 Installing/updating dependencies..."
npm install --production

echo "🔄 Restarting services..."
pm2 start aoe4-api aoe4-worker

echo "💾 Saving PM2 configuration..."
pm2 save

echo "📊 Checking service status..."
pm2 status

echo "🧹 Cleaning up..."
rm -f /tmp/backend-update.tar.gz

echo "✅ Backend update completed successfully!"
EOF

echo "🧹 Cleaning up local files..."
rm -f backend-update.tar.gz

echo ""
echo "🎉 Backend deployment completed!"
echo "📊 Service Status:"
ssh -i "$KEY_FILE" ec2-user@"$EC2_HOST" "pm2 status"

echo ""
echo "🔗 Testing API endpoint..."
sleep 5  # Give services time to start

# Test API - UPDATE WITH YOUR DOMAIN
if curl -f -s https://api.your-domain.com >/dev/null 2>&1; then
    echo "✅ API is responding at: https://api.your-domain.com"
else
    echo "⏳ API may still be starting or DNS still propagating..."
    echo "🔗 You can test manually: https://api.your-domain.com"
fi

echo ""
echo "📋 Deployment Summary:"
echo "   Server: $EC2_HOST"
echo "   Path: $DEPLOY_PATH"
echo "   Services: aoe4-api, aoe4-worker"
echo "   API URL: https://api.your-domain.com"