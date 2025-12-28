# Redis Session Storage Setup

This project now supports Redis for session storage, enabling horizontal scaling and better performance for production deployments.

## Prerequisites

- Redis Server (v6.0 or later recommended)
- Node.js environment

## Configuration

You can configure the session storage type using environment variables.

### 1. Environment Variables

Create or update your `.env` file:

```env
# Choose storage type: 'file' (default) or 'redis'
SESSION_STORE_TYPE=redis

# Redis Connection URL
REDIS_URL=redis://:password@localhost:6379/0

# Optional: Auth Folder (still used for file storage fallback or other assets)
BAILEYS_AUTH_FOLDER=./auth_sessions
```

### 2. Running with Redis

You can use the included `compose.yaml` to start Redis and a UI quickly using Podman or Docker.

```bash
# Start Redis and Redis UI
podman-compose up -d

# Stop
podman-compose down
```

- **Redis UI**: Open [http://localhost:8081](http://localhost:8081) in your browser.
- **Redis Password**: `baileys_password` (configured in `compose.yaml`)

Then start the application:

```bash
# Development
SESSION_STORE_TYPE=redis REDIS_URL=redis://:baileys_password@localhost:6379/0 pnpm dev
```

## Architecture

The Redis implementation uses a namespaced key structure to organize session data:

Key Format: `wa:sess:{sessionId}:{type}:{id}`

Examples:
- `wa:sess:mysession:creds:base` - Main credentials
- `wa:sess:mysession:pre-key:1` - Pre-key #1
- `wa:sess:mysession:session:user@s.whatsapp.net` - E2E Session data

## Migration

Currently, there is no automatic migration tool from File System to Redis. You will need to re-scan the QR code when switching to Redis for the first time, as it will be treated as a new session.

## Troubleshooting

- **Connection Refused**: Check if your Redis server is running and the URL is correct.
- **Authentication Failed**: Verify your Redis password in the URL.
- **Data Persistence**: Ensure your Redis instance has AOF or RDB persistence enabled if you want sessions to survive Redis restarts.
