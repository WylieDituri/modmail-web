# Deploying Modmail Web to Google Cloud App Engine

This guide will help you deploy your Next.js modmail application to Google Cloud App Engine.

## 🔧 Prerequisites

1. **Google Cloud Account**: Create one at [cloud.google.com](https://cloud.google.com)
2. **Firebase Project**: You already have this set up
3. **Google Cloud CLI**: Install the `gcloud` CLI tool

## 📋 Step 1: Install Google Cloud CLI

### macOS (using Homebrew):
```bash
brew install google-cloud-sdk
```

### Alternative (direct download):
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

## 🔑 Step 2: Initialize Google Cloud

1. **Login to Google Cloud**:
   ```bash
   gcloud auth login
   ```

2. **Set your project** (use your Firebase project ID):
   ```bash
   gcloud config set project gl-modmail
   ```

3. **Enable required APIs**:
   ```bash
   gcloud services enable appengine.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

## 📝 Step 3: Create App Engine Configuration

Create an `app.yaml` file in your project root:

```yaml
runtime: nodejs20

env_variables:
  # Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyAovQNSOX-6S_In0Z8XpYM7Efs0hwTCFzA"
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "gl-modmail.firebaseapp.com"
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "gl-modmail"
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "gl-modmail.firebasestorage.app"
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "478695219304"
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:478695219304:web:7372c2af9c8d56cf485bdd"
  
  # Discord OAuth Configuration
  DISCORD_CLIENT_ID: "1391962293381763142"
  DISCORD_CLIENT_SECRET: "B-qskMMLb6IrEo-syq2bl48-XZ19PMTE"
  DISCORD_REDIRECT_URI: "https://gl-modmail.uc.r.appspot.com/auth/discord/callback"
  NEXT_PUBLIC_DISCORD_CLIENT_ID: "1391962293381763142"
  
  # JWT Secret
  JWT_SECRET: "792f5445ae7283e775feaf3fb39e63ae9daa3a8c5e17f9e38bba11d8e0531b8cdcc11a38528a57a883a54bab4fb221e6703339c13c6516411c989e9cbbe9768c"
  
  # Moderator Discord User IDs
  OWNERS: "479399666111479808"
  
  # Optional Discord Bot Configuration
  TOKEN: "your_discord_bot_token_here"
  GUILD_ID: "your_discord_guild_id_here"
  LOG_URL: "your_logging_service_url_here"

automatic_scaling:
  min_instances: 0
  max_instances: 10
  target_cpu_utilization: 0.6

handlers:
- url: /.*
  script: auto
  secure: always
  redirect_http_response_code: 301
