#!/bin/bash

# Deploy Firestore Security Rules
# Make sure you have Firebase CLI installed: npm install -g firebase-tools

echo "Deploying Firestore Security Rules..."

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
  echo "Creating firebase.json configuration..."
  cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
EOF
fi

# Login to Firebase (if not already logged in)
echo "Checking Firebase authentication..."
firebase login --no-localhost

# Set the project (replace with your actual project ID)
echo "Setting Firebase project..."
firebase use gl-modmail

# Deploy the rules
echo "Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "✅ Firestore security rules deployed successfully!"
echo ""
echo "🔒 Your Firestore database is now secured with production rules:"
echo "   - Only authenticated moderators can access data"
echo "   - Only admins can modify configuration"
echo "   - Stats are read-only for moderators"
echo "   - All other access is denied"
