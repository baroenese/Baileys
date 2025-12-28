# 🚀 Baileys Production-Ready WhatsApp Worker

> **High-Performance Asynchronous WhatsApp Worker with Redis Pub/Sub**

## ✨ Features

### Core Architecture (v2.0.0) 🚀
- 👷 **Worker Pattern** - Decoupled architecture using BullMQ & Redis
- 📡 **Real-time Events** - Pub/Sub system for QR, Connection, and Messages
- 🔄 **Auto-reconnection** with exponential backoff
- 🛡️ **Memory Safety** - Automatic listener cleanup
- 💾 **Redis Auth State** - Scalable session management
- ⚡ **Performance optimized** with 3-tier caching strategy
- 📝 **Structured logging** with Pino

### Capabilities
- 📷 **Media Messages** - Send/receive images, videos, audio, documents
- 💬 **Quotes & Replies** - Reply context preservation
- 📊 **Polls** - Create and vote on polls
- 👥 **Group Management** - Create, update, and manage groups
- 🔐 **Multi-Session** - Handle multiple WhatsApp accounts simultaneously

## 🏗️ Architecture

```
src/
├── worker.ts                   Main Entry Point (Consumer)
├── lib/
│   ├── baileys/                Core Logic
│   │   ├── baileys-manager.ts
│   │   ├── session-orchestrator.ts
│   │   └── session-store.ts
│   └── utils/
│       └── event-publisher.ts  Redis Pub/Sub Wrapper
└── scripts/                    Test Utilities
    ├── test-producer.ts        Send Jobs
    └── test-subscriber.ts      Listen to Events
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Create `.env` file:
```env
REDIS_URL=redis://localhost:6379
BAILEYS_AUTH_FOLDER=./auth_sessions
BAILEYS_LOG_LEVEL=info
```

### 3. Start Worker
```bash
# Start the worker process
pnpm worker
```

### 4. Test Integration
Open a new terminal to simulate a backend application:

**Step 1: Listen for Events (Subscriber)**
```bash
npx tsx src/scripts/test-subscriber.ts
```

**Step 2: Send Command (Producer)**
```bash
npx tsx src/scripts/test-producer.ts
```

## 📚 Documentation

- [Program Lock Status](./PROGRAM-LOCK.md)
- [Phase 3: Pub/Sub Implementation](./PHASE-3-PUBSUB-COMPLETE.md)
- [Phase 2: Worker Implementation](./PHASE-2-WORKER-COMPLETE.md)
