# AOE4 Review App - Deployment Guide

## 🚀 Production Deployment Scripts

This guide covers the deployment scripts for the AOE4 Review application.

### 📁 Deployment Scripts

First, copy the example scripts and configure them:
```bash
cp deploy-frontend.example.sh deploy-frontend.sh
cp deploy-backend-update.example.sh deploy-backend-update.sh
cp deploy-all.example.sh deploy-all.sh
cp deploy-backend.example.sh deploy-backend.sh

# Edit each script to update:
# - S3 bucket names
# - CloudFront distribution IDs
# - EC2 hostnames
# - Domain names
# - SSH key paths
```

**Script Overview:**
- `deploy-frontend.sh` - Deploy React frontend to S3/CloudFront
- `deploy-backend-update.sh` - Update backend services on EC2
- `deploy-all.sh` - Deploy both frontend and backend
- `deploy-backend.sh` - Initial backend setup (use only once)

## 🎨 Frontend Deployment

### Quick Deploy
```bash
./deploy-frontend.sh
```

### What it does:
1. ✅ Builds React app for production (`npm run build`)
2. ✅ Uploads optimized files to S3 with proper cache headers
3. ✅ Creates CloudFront invalidation to clear cache
4. ✅ Waits for invalidation to complete
5. ✅ Provides deployment summary

### Features:
- **Optimized Caching**: Static assets cached for 1 year, HTML files cached for 1 day
- **Source Map Exclusion**: Excludes .map files from production
- **Smart Cache Control**: Different cache headers for different file types
- **Automatic Invalidation**: Clears CloudFront cache automatically

## ⚙️ Backend Deployment

### Quick Deploy
```bash
./deploy-backend-update.sh
```

### What it does:
1. ✅ Builds TypeScript to JavaScript (`npm run build`)
2. ✅ Creates deployment package with built code
3. ✅ Uploads to EC2 server
4. ✅ Stops running services gracefully
5. ✅ Extracts new code and installs dependencies
6. ✅ Restarts services with PM2
7. ✅ Verifies deployment success

### Services Managed:
- `aoe4-api` - Main API server (Port 4000)
- `aoe4-worker` - Background job processor

## 🔄 Full Deployment

### Deploy Everything
```bash
./deploy-all.sh
```

### Deploy Specific Component
```bash
./deploy-all.sh frontend    # Frontend only
./deploy-all.sh backend     # Backend only
./deploy-all.sh all         # Both (default)
```

## 🏗️ Production Architecture

```
Frontend:  User → aoe4.senteai.com → CloudFront → S3
Backend:   User → api-aoe4.senteai.com → EC2 → Nginx → Node.js (Port 4000)
```

## 📊 Production URLs

- **Frontend**: https://aoe4.senteai.com
- **Backend API**: https://api-aoe4.senteai.com
- **CloudFront**: https://d313vfnjljqg1v.cloudfront.net

## 🔧 Configuration

### Environment Variables (Backend)
All environment variables are pre-configured on the EC2 server:
- Database (RDS PostgreSQL)
- AWS SQS Queue
- Auth0 Configuration  
- OpenAI API Key

### AWS Resources
- **S3 Bucket**: `aoe4-senteai-frontend`
- **CloudFront Distribution**: `E2OOEQ5YWJCHY5`
- **EC2 Instance**: `ec2-3-95-154-18.compute-1.amazonaws.com` (t2.medium)
- **SSL Certificates**: Auto-renewed with Let's Encrypt

## 🚨 Troubleshooting

### Frontend Issues
```bash
# Check CloudFront cache
aws cloudfront get-invalidation --distribution-id E2OOEQ5YWJCHY5 --id <INVALIDATION_ID>

# Check S3 files
aws s3 ls s3://aoe4-senteai-frontend --recursive
```

### Backend Issues
```bash
# SSH into server
ssh -i sente-games.pem ec2-user@ec2-3-95-154-18.compute-1.amazonaws.com

# Check PM2 status
pm2 status

# Check logs
pm2 logs aoe4-api
pm2 logs aoe4-worker

# Restart services
pm2 restart aoe4-api aoe4-worker
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --nginx
```

## 📈 Performance Optimizations

### Frontend
- Gzip compression enabled
- Long-term caching for static assets
- CloudFront global CDN
- Optimized build sizes

### Backend
- PM2 process management
- Nginx reverse proxy
- SSL termination
- Auto-restart on failure

## 🔒 Security

- HTTPS enforced on all endpoints
- SSL certificates auto-renewed
- Environment variables secured
- Private keys not in repository

## 📋 Deployment Checklist

Before deploying:
- [ ] Test locally first
- [ ] Ensure AWS CLI is configured
- [ ] Verify SSH key permissions
- [ ] Check if services are running

After deploying:
- [ ] Test frontend: https://aoe4.senteai.com
- [ ] Test backend: https://api-aoe4.senteai.com
- [ ] Verify PM2 services are running
- [ ] Check application logs for errors

## 🆘 Emergency Rollback

### Frontend Rollback
```bash
# Use previous CloudFront deployment or re-run with previous build
aws s3 sync s3://aoe4-senteai-frontend-backup/ s3://aoe4-senteai-frontend/
aws cloudfront create-invalidation --distribution-id E2OOEQ5YWJCHY5 --paths "/*"
```

### Backend Rollback
```bash
# SSH into server and revert to previous deployment
ssh -i sente-games.pem ec2-user@ec2-3-95-154-18.compute-1.amazonaws.com
cd /opt/aoe4-review
# Restore from backup or redeploy previous version
```