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

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the Firebase configuration in `.env.local` with your values:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## 5. Firebase Security Rules (Production)

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

## 6. Database Collections

The app will automatically create these collections in Firestore:

- **users**: Store user information (Discord ID, username, avatar, moderator status)
- **sessions**: Store chat sessions (user ID, status, timestamps, satisfaction rating)
- **messages**: Store individual messages (content, author, session, timestamp, anonymous flag)

## 7. Running the Application

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

1. **"Permission denied" errors**: Check your Firestore security rules
2. **"Firebase app not initialized"**: Verify your environment variables are set correctly
3. **Connection issues**: Ensure your Firebase project is active and billing is set up if needed

## Migration from Memory Storage

All data previously stored in memory will be lost when switching to Firestore. This is expected since memory storage was temporary. The new Firestore setup provides persistent data storage.
