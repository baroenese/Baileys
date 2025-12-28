# 🔒 PROGRAM LOCK - DO NOT MODIFY WITHOUT REVIEW

> **Status**: ✅ LOCKED & PRODUCTION READY
> **Last Locked**: December 29, 2025 (Worker + Pub/Sub Update)
> **Lock Version**: 2.0.0 WORKER (Async Architecture)
> **Protection Level**: HIGH - Architecture Refactored

**⚠️ WARNING**: Program ini telah direfaktor menjadi arsitektur Worker Asynchronous. Struktur file telah berubah total. Jangan ubah tanpa memahami arsitektur baru!

---

## 📦 PROTECTED FILE STRUCTURE

```
src/
├── lib/                        📂 Core Library
│   ├── baileys/
│   │   ├── baileys-manager.ts          ⛔ CRITICAL - Core connection & Event Publishing
│   │   ├── extended-baileys-manager.ts ⛔ CRITICAL - Feature orchestration
│   │   ├── session-orchestrator.ts     ⛔ CRITICAL - Multi-session manager
│   │   └── session-store.ts            🔒 PROTECTED - Auth state manager
│   ├── config/
│   │   └── config.ts                   ⛔ CRITICAL - Configuration
│   ├── features/                       📂 Message Features
│   │   └── messages/                   ✅ SAFE - Handlers (Media, Polls, etc.)
│   ├── types/                          🔒 PROTECTED - Type definitions
│   └── utils/
│       ├── event-publisher.ts          ⛔ CRITICAL - Redis Pub/Sub Wrapper
│       └── logger.ts                   ✅ SAFE - Logging setup
├── scripts/                    📂 Utility Scripts
│   ├── test-producer.ts        ✅ SAFE - Test Job Sender
│   └── test-subscriber.ts      ✅ SAFE - Test Event Listener
├── worker.ts                   ⛔ CRITICAL - Main Worker Entry Point
└── index.ts                    ⚠️ LEGACY - CLI Entry Point (Dev only)
```

---

## 🚫 CRITICAL RULES - NEVER VIOLATE

### Rule #1: Worker Architecture
The system now runs as a **Worker** consuming jobs from Redis.
- **Entry Point**: `src/worker.ts`
- **Queue Name**: `whatsapp-jobs`
- **Event Channel**: `whatsapp:events:{sessionId}`

### Rule #2: Event Publishing
All external communication MUST go through Redis Pub/Sub.
- **NEVER** use `console.log` for application events.
- **ALWAYS** use `this.eventPublisher.publish()` in `BaileysManager`.
- **Events**: `QR_RECEIVED`, `CONNECTION_UPDATE`, `MESSAGE_UPSERT`.

### Rule #3: Session Management
Sessions are managed by `SessionOrchestrator`.
- **NEVER** instantiate `BaileysManager` directly in `worker.ts`.
- **ALWAYS** use `orchestrator.startSession(id)`.

---

## 🧪 VERIFIED CAPABILITIES (v2.0.0)

### 1. Async Worker Architecture
- ✅ **Job Consumption**: Worker correctly processes `START_SESSION`, `SEND_MESSAGE`.
- ✅ **Event Broadcasting**: Worker publishes QR and Status to Redis channels.
- ✅ **Scalability**: Decoupled Producer/Consumer model allows independent scaling.

### 2. Core Stability
- ✅ **Connection**: Auto-reconnects perfectly.
- ✅ **Auth**: Multi-file auth state works with Redis backing.
- ✅ **Graceful Shutdown**: Worker closes all sessions on SIGTERM.

### 3. Integration
- ✅ **Producer Test**: `src/scripts/test-producer.ts` verifies job submission.
- ✅ **Subscriber Test**: `src/scripts/test-subscriber.ts` verifies event reception.

---

## 📝 CONFIGURATION LOCK

The `.env` file is the single source of truth.

```env
# Redis Configuration (REQUIRED)
REDIS_URL=redis://localhost:6379

# Baileys Configuration
BAILEYS_AUTH_FOLDER=./auth_sessions
BAILEYS_LOG_LEVEL=info
PRINT_QR_IN_TERMINAL=false
BROWSER_NAME=Baileys Worker
```
