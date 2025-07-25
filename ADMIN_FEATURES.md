# Admin Features Documentation

This document explains the admin features added to the Modmail web application.

## Overview

The admin system provides enhanced management capabilities for designated admin users, including:
- Per-moderator statistics tracking
- Moderator management (add/remove moderators)
- System-wide analytics
- Admin-only dashboard

## Environment Configuration

### Required Environment Variables

Add these to your `.env` file and deployment configuration:

```bash
# Existing moderator configuration
OWNERS=discord_user_id_1,discord_user_id_2,discord_user_id_3

# New admin configuration
ADMINS=admin_discord_user_id_here
```

### Admin vs Moderator Permissions

- **Moderators** (`OWNERS`): Can access the moderator dashboard, manage chat sessions, respond to users
- **Admins** (`ADMINS`): All moderator permissions + admin dashboard access + moderator management

**Note**: Admin users should also be included in the `OWNERS` list to have moderator access.

## Admin Dashboard Features

### Access

Admin users can access the admin dashboard at `/admin` or via the "Admin Panel" button in the moderator dashboard header.

### Statistics Overview

The admin dashboard provides:

1. **System-wide Stats**:
   - Total number of moderators
   - Total sessions across all moderators
   - Currently active sessions
   - Average satisfaction rating

2. **Per-Moderator Statistics**:
   - Individual moderator performance metrics
   - Sessions handled by each moderator
   - Active sessions per moderator
   - Individual satisfaction ratings

### Moderator Management

Admins can:

1. **View Current Moderators**: See all Discord user IDs in the `OWNERS` list
2. **Add New Moderators**: Get instructions for adding new moderator IDs
3. **Remove Moderators**: Get instructions for removing moderator access

**Important**: Moderator changes require updating environment variables in your deployment platform and redeploying the application.

## API Endpoints

### Admin Stats
- **Endpoint**: `GET /api/admin/stats`
- **Authentication**: Admin token required
- **Response**: Complete admin statistics including per-moderator data

### Moderator Management
- **Endpoint**: `GET /api/admin/moderators`
- **Authentication**: Admin token required
- **Response**: Current list of moderator Discord IDs

- **Endpoint**: `POST /api/admin/moderators`
- **Authentication**: Admin token required
- **Body**: `{ "action": "add|remove", "discordId": "user_id" }`
- **Response**: Instructions for updating environment variables

## Security

### Authentication Flow

1. **JWT Token Verification**: All admin endpoints verify JWT tokens
2. **Admin Status Check**: Double verification against `ADMINS` environment variable
3. **Route Protection**: Middleware automatically redirects non-admin users

### Route Protection

The middleware protects these routes:
- `/admin/*` - Admin access required
- `/moderator/*` - Moderator access required
- `/dashboard/*` - User authentication required

## Database Schema

### Per-Moderator Stats

Stats are calculated in real-time from existing session data:

```typescript
interface ModeratorStats {
  totalSessions: number;      // Total sessions assigned to moderator
  activeSessions: number;     // Currently active sessions
  resolvedToday: number;      // Sessions closed today
  satisfactionRate: number;   // Percentage of positive ratings
}
```

### Firestore Queries

New methods added to `FirestoreService`:

- `getModerators()`: Returns all users with `isModerator: true`
- `getModeratorStats(moderatorId)`: Calculates stats for a specific moderator

## Deployment Instructions

### 1. Update Environment Variables

#### Google Cloud App Engine
Update your `app.yaml`:
```yaml
env_variables:
  OWNERS: "id1,id2,id3"
  ADMINS: "admin_id"
```

#### Other Platforms
Add the `ADMINS` environment variable to your deployment platform's configuration.

### 2. Deploy Application

```bash
# For Google Cloud App Engine
./deploy.sh

# Or manually
gcloud app deploy
```

### 3. Verify Admin Access

1. Log in with an admin Discord account
2. Navigate to `/admin` or click "Admin Panel" in the moderator dashboard
3. Verify you can see system stats and moderator management features

## Usage Examples

### Setting Up Admins

1. **Identify Admin Users**: Get Discord user IDs for admin users
2. **Update Configuration**: Add IDs to `ADMINS` environment variable
3. **Ensure Moderator Access**: Add admin IDs to `OWNERS` as well
4. **Deploy Changes**: Redeploy application with new configuration

Example configuration:
```bash
OWNERS=479399666111479808,690033574346227774,252481256866971649
ADMINS=479399666111479808
```

### Adding New Moderators

1. **Access Admin Dashboard**: Navigate to `/admin`
2. **Enter Discord ID**: Use the "Add New Moderator" form
3. **Follow Instructions**: The system provides exact environment variable updates needed
4. **Update Deployment**: Modify `OWNERS` in your deployment configuration
5. **Redeploy**: Deploy the updated configuration

### Monitoring Performance

The admin dashboard provides real-time insights into:
- Which moderators are most active
- System-wide response performance
- User satisfaction trends
- Resource allocation needs

## Troubleshooting

### Common Issues

1. **"Admin access required" error**:
   - Verify user ID is in `ADMINS` environment variable
   - Check that environment variable is properly set in deployment
   - Ensure user has logged in after admin configuration update

2. **Admin dashboard not accessible**:
   - Verify middleware configuration includes `/admin/*`
   - Check that user is authenticated with valid JWT token
   - Confirm user has both admin and moderator permissions

3. **Stats not loading**:
   - Verify Firestore permissions for service account
   - Check that moderator users exist in Firestore
   - Review API endpoint logs for errors

### Security Considerations

- **Environment Variable Security**: Keep admin Discord IDs confidential
- **Regular Audits**: Periodically review admin and moderator lists
- **Least Privilege**: Only grant admin access to users who need it
- **Token Management**: Admin actions use same JWT tokens as moderator actions

## Future Enhancements

Potential future admin features:
- **Real-time Updates**: WebSocket integration for live dashboard updates
- **Advanced Analytics**: Detailed reporting and trend analysis
- **Automated Moderation**: ML-powered content moderation suggestions
- **Role Management**: Granular permission system beyond admin/moderator
- **Audit Logging**: Detailed logs of admin actions and changes
