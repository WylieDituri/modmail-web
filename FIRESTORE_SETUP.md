# Firestore Setup Guide

This project now uses Firebase Firestore instead of in-memory storage. Follow these steps to set up your Firebase project:

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Give your project a name (e.g., "modmail-web")
4. Continue through the setup process
5. Choose whether to enable Google Analytics (optional)

## 2. Set up Firestore Database

1. In your Firebase project console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose closest to your users)

## 3. Get Firebase Configuration

1. In your Firebase project console, go to "Project Settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and choose the web icon `</>`
4. Give your app a nickname (e.g., "modmail-web")
5. You don't need to set up Firebase Hosting for now
6. Copy the Firebase configuration object

## 4. Set up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the Firebase configuration in `.env` with your values:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## 5. Create Required Firestore Indexes

Firestore requires composite indexes for certain queries. You'll need to create these indexes:

### Automatic Index Creation
1. Run your app and try to use the features that require indexes
2. When you get an index error, Firebase will provide a direct link to create the index
3. Click the link in the error message to automatically create the required index

### Manual Index Creation
Alternatively, go to [Firestore Indexes](https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes) and create these indexes:

**Messages Collection Index:**
- Collection ID: `messages`
- Fields:
  - `sessionId` (Ascending)
  - `timestamp` (Ascending)

**Sessions Collection Index:**
- Collection ID: `sessions` 
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)

**Sessions Collection Index (for stats):**
- Collection ID: `sessions`
- Fields:
  - `updatedAt` (Descending)

### Quick Fix for Index Errors
When you see an index error, simply:
1. Copy the URL from the error message
2. Open it in your browser
3. Click "Create Index"
4. Wait 1-2 minutes for the index to build

**For your current error, click this link:**
```
https://console.firebase.google.com/v1/r/project/gl-modmail/firestore/indexes?create_composite=Cktwcm9qZWN0cy9nbC1tb2RtYWlsL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZXNzYWdlcy9pbmRleGVzL18QARoNCglzZXNzaW9uSWQQARoNCgl0aW1lc3RhbXAQARoMCghfX25hbWVfXxAB
```

This will create the required index for the `messages` collection with fields: `sessionId` (Ascending) and `timestamp` (Ascending).

## 6. Firebase Security Rules (Production)

For production, update your Firestore rules to be more secure. In the Firebase console, go to "Firestore Database" > "Rules" and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to users collection
    match /users/{document} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
    
    // Allow read/write access to sessions collection
    match /sessions/{document} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
    
    // Allow read/write access to messages collection
    match /messages/{document} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}
```

**Note:** These rules are permissive for development. For production, you should implement proper authentication and authorization.

## 7. Database Collections

The app will automatically create these collections in Firestore:

- **users**: Store user information (Discord ID, username, avatar, moderator status)
- **sessions**: Store chat sessions (user ID, status, timestamps, satisfaction rating)
- **messages**: Store individual messages (content, author, session, timestamp, anonymous flag)

## 8. Running the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The application will now use Firestore for data persistence instead of in-memory storage.

## Features Migrated to Firestore

✅ **User Management**: Create and retrieve users  
✅ **Session Management**: Create, update, and query chat sessions  
✅ **Message Storage**: Store and retrieve messages with anonymous support  
✅ **Statistics**: Calculate satisfaction rates and session counts  
✅ **Grouped Sessions**: Group sessions by user with proper filtering  
✅ **Search Functionality**: Search across users and message content  
✅ **Satisfaction Ratings**: Store and display user feedback  

## Troubleshooting

### Common Firebase Errors

1. **"Permission denied" errors**: 
   - Check your Firestore security rules
   - Ensure you're in "test mode" for development

2. **"Firebase app not initialized"**: 
   - Verify your environment variables are set correctly in `.env`
   - Make sure all `NEXT_PUBLIC_FIREBASE_*` variables are present

3. **"The query requires an index" errors**:
   - Click the link provided in the error message to create the index automatically
   - Wait 1-2 minutes for the index to build
   - Common indexes needed:
     - `messages` collection: `sessionId` (Ascending), `timestamp` (Ascending)
     - `sessions` collection: `userId` (Ascending), `createdAt` (Descending)

4. **"Function addDoc() called with invalid data" errors**:
   - This usually means undefined values are being sent to Firestore
   - The app has been updated to handle this automatically
   - Restart your development server after updating

5. **Connection issues**: 
   - Ensure your Firebase project is active
   - Check if billing is set up (required for some Firebase features)
   - Verify your internet connection

### Steps to Fix Index Errors
When you see an index error:
1. Copy the URL from the error message (starts with `https://console.firebase.google.com/...`)
2. Open the URL in your browser
3. Click "Create Index" 
4. Wait for the index to build (usually 1-2 minutes)
5. Refresh your app

### Development vs Production
- **Development**: Use "test mode" rules for easy setup
- **Production**: Implement proper authentication and stricter security rules

## Migration from Memory Storage

All data previously stored in memory will be lost when switching to Firestore. This is expected since memory storage was temporary. The new Firestore setup provides persistent data storage.
