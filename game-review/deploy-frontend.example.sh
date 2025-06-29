#!/bin/bash

# AOE4 Review App - Frontend Deployment Script (EXAMPLE)
# Copy this file to deploy-frontend.sh and update with your actual values
# Usage: ./deploy-frontend.sh

set -e

echo "🚀 Starting Frontend Deployment to Production"

# Configuration - UPDATE THESE VALUES
S3_BUCKET="your-s3-bucket-name"
CLOUDFRONT_DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID"
BUILD_DIR="ui/build"

# Check if we're in the right directory
if [ ! -d "ui" ]; then
    echo "❌ Error: Must run from project root directory (where ui/ folder exists)"
    exit 1
fi

# Build React app for production
echo "📦 Building React app for production..."
cd ui
npm run build
cd ..

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory not found at $BUILD_DIR"
    exit 1
fi

# Upload to S3 with optimized settings
echo "📤 Uploading files to S3 bucket: $S3_BUCKET"
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET \
    --delete \
    --exclude "*.map" \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --exclude "manifest.json" \
    --exclude "robots.txt"

# Upload cache-busting files with shorter cache
echo "📤 Uploading cache-busting files..."
aws s3 cp $BUILD_DIR/index.html s3://$S3_BUCKET/index.html \
    --cache-control "public,max-age=0,s-maxage=86400"

aws s3 cp $BUILD_DIR/manifest.json s3://$S3_BUCKET/manifest.json \
    --cache-control "public,max-age=86400"

if [ -f "$BUILD_DIR/robots.txt" ]; then
    aws s3 cp $BUILD_DIR/robots.txt s3://$S3_BUCKET/robots.txt \
        --cache-control "public,max-age=86400"
fi

# Create CloudFront invalidation
echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "⏳ Waiting for CloudFront invalidation to complete..."
echo "   Invalidation ID: $INVALIDATION_ID"

# Wait for invalidation to complete (optional - can be run in background)
aws cloudfront wait invalidation-completed \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --id $INVALIDATION_ID

echo "✅ Frontend deployment completed successfully!"
echo "🌐 Your app is live at: https://your-domain.com"
echo "📊 CloudFront invalidation completed: $INVALIDATION_ID"

# Display file count and sizes
echo ""
echo "📈 Deployment Summary:"
echo "   Files uploaded: $(find $BUILD_DIR -type f | wc -l)"
echo "   Total size: $(du -sh $BUILD_DIR | cut -f1)"
echo "   S3 Bucket: s3://$S3_BUCKET"
echo "   CloudFront: https://your-cloudfront-domain.cloudfront.net"
echo "   Custom Domain: https://your-domain.com"