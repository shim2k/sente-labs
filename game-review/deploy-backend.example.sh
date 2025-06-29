#!/bin/bash

# AOE4 Review App - Backend Initial Deployment Script (EXAMPLE)
# Copy this file to deploy-backend.sh and update with your actual values
# Usage: ./deploy-backend.sh <ec2-instance-ip>

if [ $# -ne 1 ]; then
    echo "Usage: $0 <ec2-instance-ip>"
    echo "Example: $0 ec2-xx-xx-xx-xx.compute-1.amazonaws.com"
    exit 1
fi

EC2_HOST=$1
KEY_FILE="./your-ssh-key.pem"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file $KEY_FILE not found!"
    exit 1
fi

echo "🚀 Deploying AOE4 Review Backend to $EC2_HOST"

# Create deployment package
echo "📦 Creating deployment package..."
cd server
npm run build
tar -czf ../deployment.tar.gz package.json package-lock.json dist/ src/db/

cd ..

# Upload to EC2
echo "📤 Uploading files to EC2..."
scp -i "$KEY_FILE" deployment.tar.gz ec2-user@"$EC2_HOST":/tmp/

# Deploy on EC2
echo "🔧 Setting up on EC2..."
ssh -i "$KEY_FILE" ec2-user@"$EC2_HOST" << 'EOF'
  # Update system
  sudo yum update -y
  
  # Install Node.js if not installed
  if ! command -v node &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.bashrc
    nvm install 18
    nvm use 18
    npm install -g pm2
  fi
  
  # Create app directory
  sudo mkdir -p /opt/aoe4-review
  sudo chown ec2-user:ec2-user /opt/aoe4-review
  
  # Extract deployment
  cd /opt/aoe4-review
  tar -xzf /tmp/deployment.tar.gz
  
  # Install dependencies
  npm install --production
  
  # Setup environment variables - UPDATE THESE VALUES
  cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=4000

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Database
DATABASE_URL=postgres://username:password@your-rds-endpoint:5432/database

# AWS SQS
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/account/queue-name
AWS_REGION=us-east-1

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
ENVEOF

  echo "✅ Environment variables configured!"
  
  # Install nginx if not installed
  if ! command -v nginx &> /dev/null; then
    sudo yum install nginx -y
  fi
  
  # Create nginx config - UPDATE API DOMAIN
  sudo tee /etc/nginx/conf.d/aoe4.conf > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:4000;
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
NGINXEOF

  # Start nginx
  sudo systemctl start nginx
  sudo systemctl enable nginx
  
  # Install certbot for SSL
  sudo yum install certbot python3-certbot-nginx -y
  
  # Start the services with PM2
  echo "🚀 Starting services with PM2..."
  pm2 start dist/index.js --name aoe4-api
  pm2 start dist/worker.js --name aoe4-worker
  
  # Save PM2 configuration
  pm2 save
  pm2 startup
  
  echo "✅ Deployment complete!"
  echo "📝 Next steps:"
  echo "1. Run: sudo certbot --nginx -d api.your-domain.com"
  echo "2. Add DNS record for api.your-domain.com → $(curl -s http://169.254.169.254/latest/meta-data/public-hostname)"
EOF

echo "🎉 Backend deployment script completed!"
echo "📋 The backend should now be running on port 4000!"
echo "🔗 Test it: curl http://$EC2_HOST:4000/health"

# Cleanup
rm deployment.tar.gz