# Testing Inactive User Feature

## What was implemented:

1. **Inactive User Detection**: Added a helper function `isUserInactive()` that checks if a user hasn't sent a message in over an hour.

2. **User Session Page**: Added an "Inactive User" tag that appears next to the session info when the user hasn't replied in over an hour.

3. **Moderator Dashboard**: Added the same "Inactive User" tag in the session list to help moderators identify inactive sessions.

## How it works:

1. The system looks for the last message from a user (not a moderator) in the session.
2. If that message is older than 1 hour, the session is marked as having an "Inactive User".
3. The tag appears as an orange badge next to the user's name.
4. The tag only shows for sessions that are not closed.

## Visual Design:

- **Badge Color**: Orange background (`bg-orange-100`) with dark orange text (`text-orange-800`)
- **Badge Style**: Small rounded pill with padding
- **Placement**: Next to the user's name in both the session page and moderator dashboard

## To test:

1. Create a new session and send a message
2. Wait for over an hour (or modify the time check in the code for testing)
3. The "Inactive User" tag should appear in both:
   - The session page header
   - The moderator dashboard session list

## Code locations:

- Session page: `/src/app/session/[sessionId]/page.tsx`
- Moderator dashboard: `/src/app/moderator/page.tsx`
- Helper function: `isUserInactive()` in both files

This approach is much better than auto-closing sessions because:
- It preserves session history
- Moderators can still respond to inactive users
- Users can return to their sessions
- It provides visual feedback without being destructive
