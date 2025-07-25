#!/bin/bash

# Modmail Web - Google Cloud App Engine Deployment Script

set -e

echo "🚀 Starting deployment to Google Cloud App Engine..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install it first:${NC}"
    echo ""
    echo -e "${YELLOW}Option 1 - Direct Download (Recommended):${NC}"
    echo "   curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-464.0.0-darwin-x86_64.tar.gz -o google-cloud-sdk.tar.gz"
    echo "   tar -xzf google-cloud-sdk.tar.gz"
    echo "   ./google-cloud-sdk/install.sh"
    echo ""
    echo -e "${YELLOW}Option 2 - Homebrew (if network allows):${NC}"
    echo "   brew install google-cloud-sdk"
    echo ""
    echo -e "${YELLOW}Option 3 - Interactive installer:${NC}"
    echo "   curl https://sdk.cloud.google.com | bash"
    echo ""
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not logged in to gcloud. Logging in...${NC}"
    gcloud auth login
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project set. Please set your project:${NC}"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"

# Check if App Engine app exists
if ! gcloud app describe &>/dev/null; then
    echo -e "${YELLOW}⚠️  App Engine app not found. Creating app...${NC}"
    echo "Available regions:"
    echo "  us-central (Iowa)"
    echo "  us-east1 (South Carolina)" 
    echo "  europe-west (Belgium)"
    echo "  asia-northeast1 (Tokyo)"
    
    read -p "Enter region [us-central]: " REGION
    REGION=${REGION:-us-central}
    
    gcloud app create --region=$REGION
    echo -e "${GREEN}✅ App Engine app created in $REGION${NC}"
fi

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# Check if app.yaml exists
if [ ! -f "app.yaml" ]; then
    echo -e "${RED}❌ app.yaml not found. Please create it first.${NC}"
    exit 1
fi

# Deploy
echo -e "${YELLOW}🚀 Deploying to App Engine...${NC}"
gcloud app deploy --quiet

# Get the URL
URL=$(gcloud app browse --no-launch-browser 2>&1 | grep -o 'https://[^[:space:]]*')

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${GREEN}📱 Your app is available at: $URL${NC}"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update Discord OAuth redirect URI in Discord Developer Portal:"
echo "   $URL/auth/discord/callback"
echo ""
echo "2. Test your application:"
echo "   $URL"
echo ""
echo "3. View logs:"
echo "   gcloud app logs tail -s default"

# Open browser (optional)
read -p "Open the app in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$URL"
fi
