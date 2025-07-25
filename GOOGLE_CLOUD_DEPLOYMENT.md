# Deploying Modmail Web to Google Cloud App Engine

This guide will help you deploy your Next.js modmail application to Google Cloud App Engine.

## 🔧 Prerequisites

1. **Google Cloud Account**: Create one at [cloud.google.com](https://cloud.google.com)
2. **Firebase Project**: You already have this set up
3. **Google Cloud CLI**: Install the `gcloud` CLI tool

## 📋 Step 1: Install Google Cloud CLI

### Option 1: macOS (using Homebrew) - **If network issues, try Option 2**:
```bash
brew install google-cloud-sdk
```

### Option 2: Direct Download (Recommended if Homebrew fails):
```bash
# Download the installer
curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-464.0.0-darwin-x86_64.tar.gz -o google-cloud-sdk.tar.gz

# Extract and install
tar -xzf google-cloud-sdk.tar.gz
./google-cloud-sdk/install.sh

# Add to PATH (add this to your ~/.zshrc or ~/.bash_profile)
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
source ~/.zshrc  # or source ~/.bash_profile
```

### Option 3: Using the Interactive Installer:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Option 4: Using Package Manager (Alternative):
```bash
# Install using pip (if you have Python)
pip install google-cloud-sdk

# Or using conda
conda install -c conda-forge google-cloud-sdk
```

### Verify Installation:
```bash
gcloud version
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
  NEXT_PUBLIC_FIREBASE_API_KEY: "your_firebase_api_key_here"
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com"
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "your-project-id"
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "your-project.firebasestorage.app"
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "your_sender_id_here"
  NEXT_PUBLIC_FIREBASE_APP_ID: "your_app_id_here"
  
  # Discord OAuth Configuration
  DISCORD_CLIENT_ID: "your_discord_client_id_here"
  DISCORD_CLIENT_SECRET: "your_discord_client_secret_here"
  DISCORD_REDIRECT_URI: "https://your-project-id.uc.r.appspot.com/auth/discord/callback"
  NEXT_PUBLIC_DISCORD_CLIENT_ID: "your_discord_client_id_here"
  
  # JWT Secret
  JWT_SECRET: "your_jwt_secret_here"
  
  # Moderator Discord User IDs
  OWNERS: "your_discord_user_id_here"
  
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
````

## 📦 Step 4: Update package.json for Production

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p $PORT",
    "gcp-build": "npm run build"
  }
}
```

## 🔄 Step 5: Update Discord OAuth Redirect URI

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2 > General**
4. Add your production redirect URI:
   ```
   https://your-project-id.uc.r.appspot.com/auth/discord/callback
   ```
   *(Replace `your-project-id` with your actual project ID)*

## 🚀 Step 6: Deploy to App Engine

1. **Create App Engine app** (first time only):
   ```bash
   gcloud app create --region=us-central
   ```

2. **Deploy your application**:
   ```bash
   gcloud app deploy
   ```

3. **View your deployed app**:
   ```bash
   gcloud app browse
   ```

## 🔧 Step 7: Environment Variables Security

For better security, you can use Google Cloud Secret Manager instead of putting secrets in `app.yaml`:

1. **Create secrets**:
   ```bash
   echo "your_discord_client_secret_here" | gcloud secrets create discord-client-secret --data-file=-
   echo "your_jwt_secret_here" | gcloud secrets create jwt-secret --data-file=-
   ```

2. **Update app.yaml to use secrets**:
   ```yaml
   runtime: nodejs20
   
   env_variables:
     # Firebase Configuration (public)
     NEXT_PUBLIC_FIREBASE_API_KEY: "your_firebase_api_key_here"
     # ... other public vars
   
   # Secret environment variables
   beta_settings:
     cloud_sql_instances: []
   
   # Use Secret Manager
   includes:
   - env_variables:
       DISCORD_CLIENT_SECRET: ${DISCORD_CLIENT_SECRET}
       JWT_SECRET: ${JWT_SECRET}
   ```

## 🎯 Step 8: Custom Domain (Recommended)

### Option A: Using Your Own Domain

1. **Purchase a domain** from any registrar (GoDaddy, Namecheap, Google Domains, etc.)

2. **Map custom domain to App Engine**:
   ```bash
   gcloud app domain-mappings create yourdomain.com
   ```

3. **Add DNS records** provided by Google Cloud to your domain registrar:
   - Google will provide specific A and AAAA records
   - Add these in your domain's DNS settings

4. **Update Discord OAuth redirect URI**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Update redirect URI to: `https://yourdomain.com/auth/discord/callback`

5. **Update app.yaml**:
   ```yaml
   DISCORD_REDIRECT_URI: "https://yourdomain.com/auth/discord/callback"
   ```

6. **Deploy changes**:
   ```bash
   gcloud app deploy
   ```

### Option B: Using a Subdomain

If you already own a domain, you can use a subdomain:

1. **Map subdomain**:
   ```bash
   gcloud app domain-mappings create modmail.yourdomain.com
   ```

2. **Update DNS with CNAME record**:
   - Add CNAME: `modmail` → `gl-modmail.uc.r.appspot.com`

3. **Update Discord OAuth and app.yaml** as above

### Verification

- SSL certificates are automatically provided by Google
- Your site will be accessible at both HTTP and HTTPS (HTTP redirects to HTTPS)
- Propagation can take up to 24 hours

## 🎯 Step 8: Custom Domain (Optional)

1. **Map custom domain**:
   ```bash
   gcloud app domain-mappings create yourdomain.com
   ```

2. **Update DNS records** as instructed by Google Cloud

3. **Update Discord OAuth redirect** to use your custom domain

## 🔍 Step 9: Monitoring and Logs

1. **View logs**:
   ```bash
   gcloud app logs tail -s default
   ```

2. **View in Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **App Engine > Services**
   - Click on your service to view details

## 🐛 Troubleshooting

### Common Issues:

1. **Build fails**:
   - Make sure all dependencies are in `package.json`
   - Check Node.js version compatibility

2. **Environment variables not working**:
   - Verify syntax in `app.yaml`
   - Check for typos in variable names

3. **Discord OAuth fails**:
   - Verify redirect URI exactly matches in Discord settings
   - Check that environment variables are set correctly

4. **Firestore connection issues**:
   - Ensure your App Engine service account has Firestore permissions
   - Check Firebase project settings

## 💰 Cost Optimization

App Engine pricing is based on instance hours. To minimize costs:

- Set `min_instances: 0` for development
- Use `target_cpu_utilization` to control scaling
- Monitor usage in Google Cloud Console

## 🔄 Continuous Deployment

For automated deployments, you can set up:

1. **GitHub Actions** with Cloud Build
2. **Cloud Source Repositories** integration
3. **Automated triggers** on code changes

Your app will be available at: `https://your-project-id.uc.r.appspot.com`

**Note**: Replace `your-project-id` with your actual Google Cloud project ID throughout this guide.
