#!/bin/bash

# AOE4 Review App - Full Deployment Script (EXAMPLE)
# Copy this file to deploy-all.sh and update with your actual values
# Usage: ./deploy-all.sh [frontend|backend|all]

set -e

DEPLOY_TYPE=${1:-all}

echo "🚀 AOE4 Review App - Full Production Deployment"
echo "📋 Deploy type: $DEPLOY_TYPE"
echo ""

case $DEPLOY_TYPE in
    "frontend")
        echo "🎨 Deploying Frontend Only..."
        ./deploy-frontend.sh
        ;;
    "backend")
        echo "⚙️  Deploying Backend Only..."
        ./deploy-backend-update.sh
        ;;
    "all")
        echo "🔄 Deploying Both Frontend and Backend..."
        echo ""
        
        echo "🎨 Step 1/2: Deploying Frontend..."
        ./deploy-frontend.sh
        
        echo ""
        echo "⚙️  Step 2/2: Deploying Backend..."
        ./deploy-backend-update.sh
        
        echo ""
        echo "🎉 Full deployment completed!"
        echo "🌐 Frontend: https://your-domain.com"
        echo "🔗 Backend:  https://api.your-domain.com"
        ;;
    *)
        echo "❌ Invalid deployment type: $DEPLOY_TYPE"
        echo "Usage: $0 [frontend|backend|all]"
        echo ""
        echo "Examples:"
        echo "  $0 frontend    # Deploy only frontend"
        echo "  $0 backend     # Deploy only backend"  
        echo "  $0 all         # Deploy both (default)"
        echo "  $0             # Deploy both (default)"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment completed successfully!"