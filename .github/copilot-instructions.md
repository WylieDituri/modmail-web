# Copilot Instructions for Modmail Web

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js application for a modmail chat system that connects Discord users with server moderators. The app provides real-time chat functionality with separate interfaces for moderators and users.

## Key Features
- **Moderator Dashboard**: Interface for mods to manage and respond to user messages
- **User Sessions**: Interface for users to chat with moderators
- **Real-time Communication**: WebSocket-based chat using Socket.IO
- **Discord Integration**: Connected to Discord bot for message handling
- **MongoDB Integration**: Message storage and session management

## Technical Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Authentication**: Custom session management

## Code Guidelines
- Use TypeScript for all components and utilities
- Follow Next.js App Router patterns
- Implement responsive design with Tailwind CSS
- Use React hooks for state management
- Implement proper error handling and loading states
- Follow accessibility best practices
- Use proper TypeScript interfaces for data structures

## File Structure
- `/src/app/` - App Router pages and layouts
- `/src/components/` - Reusable React components
- `/src/lib/` - Utility functions and configurations
- `/src/types/` - TypeScript type definitions
- `/src/hooks/` - Custom React hooks

## Environment Variables
- `TOKEN` - Discord bot token
- `CONNECTION_URI` - MongoDB connection string
- `GUILD_ID` - Discord server ID
- `OWNERS` - Discord owner IDs
- `LOG_URL` - Logging service URL
