# Discord OAuth Setup Guide

This guide will help you set up Discord OAuth authentication for your modmail web application.

## Prerequisites

- A Discord account
- A Discord application/bot (if you don't have one, create it first)
- Your modmail web project set up with Firestore

## Step 1: Configure Discord Application

### 1.1 Go to Discord Developer Portal
1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing application or create a new one
3. Go to the **OAuth2** section in the left sidebar

### 1.2 Add Redirect URLs
In the **OAuth2 > General** section:

1. Click **Add Redirect** under "Redirects"
2. Add these URLs:
   ```
   http://localhost:3000/auth/discord/callback
   https://yourdomain.com/auth/discord/callback
   ```
   
   **Important**: 
   - Use `http://localhost:3000` for development
   - Replace `yourdomain.com` with your actual production domain
   - The path must be exactly `/auth/discord/callback`

### 1.3 Get OAuth2 Credentials
In the **OAuth2 > General** section:

1. Copy your **Client ID**
2. Copy your **Client Secret** (click "Reset Secret" if needed)
3. Save these - you'll need them for environment variables

## Step 2: Update Environment Variables

### 2.1 Copy Environment Template
```bash
cp .env.example .env
```

### 2.2 Fill in Discord OAuth Settings
Update your `.env` file with these values:

```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_application_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Public environment variables (exposed to client)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_application_client_id

# JWT Secret for session tokens (generate a secure random string)
JWT_SECRET=your_very_secure_random_jwt_secret_key_here

# Moderator Discord IDs (comma-separated)
OWNERS=123456789012345678,987654321098765432
```

### 2.3 Generate JWT Secret
Generate a secure JWT secret:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using openssl
openssl rand -hex 64

# Option 3: Using online generator
# Visit: https://generate-secret.vercel.app/64
```

## Step 3: Configure Moderator Access

### 3.1 Get Discord User IDs
To set up moderator access, you need Discord user IDs:

1. Enable Developer Mode in Discord:
   - Discord Settings > Advanced > Developer Mode (toggle on)

2. Get User IDs:
   - Right-click on a user in Discord
   - Select "Copy User ID"
   - This gives you their Discord user ID (e.g., `123456789012345678`)

### 3.2 Update OWNERS Environment Variable
Add moderator Discord IDs to your `.env`:

```bash
OWNERS=123456789012345678,987654321098765432,555666777888999000
```

**Note**: These users will have moderator access when they log in.

## Step 4: Production Setup

### 4.1 Update Redirect URI for Production
In Discord Developer Portal:
1. Add your production redirect URI: `https://yourdomain.com/auth/discord/callback`
2. Update your production environment variables

### 4.2 Production Environment Variables
For production deployment, set these environment variables:

```bash
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_application_client_secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/discord/callback
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_application_client_id
JWT_SECRET=your_very_secure_random_jwt_secret_key_here
OWNERS=discord_user_id_1,discord_user_id_2
```

## Step 5: Test the Setup

### 5.1 Start Development Server
```bash
npm run dev
```

### 5.2 Test Authentication Flow
1. Visit `http://localhost:3000/login`
2. Click "Continue with Discord"
3. Authorize the application in Discord
4. You should be redirected back and logged in

### 5.3 Verify User Access
- **Regular users**: Redirected to `/dashboard`
- **Moderators** (users in OWNERS list): Redirected to `/moderator`

## Features Enabled by Discord OAuth

✅ **Secure Authentication**: JWT-based session management  
✅ **Role-Based Access**: Automatic moderator detection  
✅ **User Profiles**: Discord username and avatar integration  
✅ **Session Management**: Secure login/logout functionality  
✅ **Database Integration**: User data stored in Firestore  

## API Endpoints

Your app now includes these authentication endpoints:

- `GET /api/auth/login` - Get Discord OAuth URL
- `POST /api/auth/discord/callback` - Handle OAuth callback
- `GET /api/auth/verify` - Verify authentication token
- `POST /api/auth/logout` - Logout and clear session

## Troubleshooting

### Common Issues

1. **"Invalid Redirect URI" Error**:
   - Check that your redirect URI exactly matches what's in Discord Developer Portal
   - Ensure the URL includes the full path: `/auth/discord/callback`

2. **"Client ID not found" Error**:
   - Verify `DISCORD_CLIENT_ID` and `NEXT_PUBLIC_DISCORD_CLIENT_ID` are set correctly
   - Check that you're using the Client ID, not the Bot Token

3. **"Unauthorized" Errors**:
   - Verify `DISCORD_CLIENT_SECRET` is correct
   - Check that your JWT_SECRET is set

4. **Users Not Recognized as Moderators**:
   - Verify the Discord User IDs in the `OWNERS` environment variable
   - Make sure there are no spaces in the comma-separated list
   - Confirm you're using the correct Discord User IDs (not usernames)

5. **JWT Token Issues**:
   - Generate a new, secure JWT_SECRET
   - Ensure the secret is at least 32 characters long
   - Clear browser cookies and try logging in again

### Development vs Production

| Environment | Redirect URI | Client Setup |
|-------------|--------------|--------------|
| Development | `http://localhost:3000/auth/discord/callback` | Use `.env` |
| Production | `https://yourdomain.com/auth/discord/callback` | Set environment variables in hosting platform |

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret
2. **Client Secret**: Never expose in client-side code
3. **HTTPS**: Always use HTTPS in production
4. **Cookie Security**: Cookies are HTTP-only and secure in production
5. **Token Expiration**: JWT tokens expire after 7 days

## Next Steps

After setting up OAuth, you can:

1. **Customize Login Page**: Modify `/app/login/page.tsx`
2. **Add User Profiles**: Extend user data in Firestore
3. **Implement Role Permissions**: Add more granular permissions
4. **Add Logout Functionality**: Use the `/api/auth/logout` endpoint
5. **Setup Session Middleware**: Protect routes that require authentication

Your Discord OAuth setup is now complete! Users can securely authenticate with their Discord accounts, and moderators will have appropriate access levels.
