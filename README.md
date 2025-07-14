# Modmail Web

A modern Next.js application for a modmail chat system that connects Discord users with server moderators. The app provides real-time chat functionality with separate interfaces for moderators and users.

## Features

- **Moderator Dashboard**: Comprehensive interface for managing user conversations
- **User Sessions**: Clean interface for users to chat with moderators
- **Real-time Communication**: WebSocket-based chat using Socket.IO
- **Discord Integration**: Connected to Discord bot for message handling
- **MongoDB Integration**: Message storage and session management
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Authentication**: Custom session management

## Project Structure

```
src/
├── app/
│   ├── moderator/         # Moderator dashboard page
│   ├── session/           # User session page
│   ├── page.tsx           # Home page
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
├── lib/
│   └── socket.ts         # Socket.IO utility functions
├── types/
│   └── index.ts          # TypeScript type definitions
└── hooks/                # Custom React hooks
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Database Setup

1. **Install PostgreSQL**:
   - On macOS: `brew install postgresql`
   - On Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - On Windows: Download from [PostgreSQL official website](https://www.postgresql.org/download/)

2. **Create a database**:
```sql
CREATE DATABASE modmail_db;
CREATE USER modmail_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE modmail_db TO modmail_user;
```

3. **Set up environment variables**:
Create a `.env` file in the root directory with:
```env
# Discord Bot Configuration
TOKEN=your_discord_bot_token
LOG_URL=https://logs.mymodmailbot.com/
GUILD_ID=your_discord_guild_id
OWNERS=your_discord_user_id

# Database Configuration
DATABASE_URL="postgresql://modmail_user:your_password@localhost:5432/modmail_db?schema=public"

# Socket.IO Configuration
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

4. **Run database migrations**:
```bash
npx prisma migrate dev --name init
```

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Generate Prisma client**:
```bash
npx prisma generate
```

3. **Run the development server**:
```bash
npm run dev
```

4. **Open the application**:
Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### For Users
1. Visit the home page and click "Start Chat Session"
2. You'll be connected to the user session interface
3. Type your message and wait for a moderator to respond

### For Moderators
1. Visit the home page and click "Open Dashboard"
2. View all active sessions and their statistics
3. Click on a session to start chatting with the user
4. Use the close button to end sessions

## Pages

- **Home (`/`)**: Landing page with navigation to user and moderator interfaces
- **User Session (`/session`)**: Interface for users to chat with moderators
- **Moderator Dashboard (`/moderator`)**: Dashboard for moderators to manage conversations

## Environment Variables

- `TOKEN`: Discord bot token for authentication
- `GUILD_ID`: Discord server ID for bot integration
- `OWNERS`: Discord user IDs with admin privileges
- `LOG_URL`: URL for logging service integration
- `DATABASE_URL`: PostgreSQL connection string for data persistence
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO server URL for real-time communication

## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: Discord user information and moderator status
- **ChatSessions**: Individual chat sessions between users and moderators
- **Messages**: Chat messages with timestamps and author information
- **ModeratorStats**: Statistics tracking for moderator performance

### Database Commands

```bash
# Create and apply migrations
npx prisma migrate dev

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

## Development

To start developing:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Discord OAuth Setup

To enable Discord authentication, you'll need to create a Discord application:

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Note down the **Client ID** from the "General Information" tab

2. **Configure OAuth2**:
   - Go to "OAuth2" tab in your Discord application
   - Add redirect URI: `http://localhost:3000/auth/discord/callback` (for development)
   - For production, use your domain: `https://yourdomain.com/auth/discord/callback`

3. **Get Client Secret**:
   - In the "OAuth2" tab, click "Reset Secret" to generate a new client secret
   - Copy the client secret (keep it secure!)

4. **Update Environment Variables**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your Discord credentials
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   NEXT_PUBLIC_DISCORD_CLIENT_ID=your_client_id_here
   ```

## License

This project is licensed under the MIT License.
