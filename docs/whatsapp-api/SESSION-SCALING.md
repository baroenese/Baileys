# 🚀 Scaling Architecture: Managing Multiple Users & Connections

> **Guide to building a high-concurrency, multi-tenant WhatsApp infrastructure.**

This document outlines the ideal architecture for managing **hundreds or thousands of connected users** simultaneously using the Baileys library.

## 🏗️ The Ideal Architecture

For a production system handling many users, you cannot run everything in a single process. You need a distributed system.

### High-Level Overview

```mermaid
graph TD
    Client[Client Apps] --> LB[Load Balancer]
    LB --> API[API Gateway / REST API]
    API --> Redis[Redis (Pub/Sub & Cache)]
    API --> Queue[Message Queue (BullMQ/RabbitMQ)]
    
    subgraph "Worker Cluster"
        W1[Worker Node 1]
        W2[Worker Node 2]
        W3[Worker Node 3]
    end
    
    Queue --> W1
    Queue --> W2
    Queue --> W3
    
    W1 <--> WA[WhatsApp Servers]
    W2 <--> WA
    W3 <--> WA
    
    W1 --> DB[(PostgreSQL)]
    W1 --> RedisAuth[(Redis Auth Store)]
```

---

## 1. Session Management (Multi-Tenancy)

### The Challenge
Each WhatsApp connection (`makeWASocket`) is an independent WebSocket connection. It consumes:
- **Memory**: ~30-50MB idle, up to 200MB+ under load.
- **CPU**: Heavy crypto operations (decryption/encryption).
- **File Handles**: Open sockets.

### The Solution: Session Orchestrator
Instead of a single `manager` variable, you need a **Session Orchestrator** class.

```typescript
// Concept Code
class SessionOrchestrator {
    // Map of active sessions in THIS process
    private sessions = new Map<string, BaileysManager>();

    async getOrCreateSession(sessionId: string) {
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        
        // Check if session exists in DB/Redis
        // If yes, instantiate new BaileysManager
        const manager = new BaileysManager(sessionId);
        await manager.start();
        this.sessions.set(sessionId, manager);
        return manager;
    }
    
    async killSession(sessionId: string) {
        const manager = this.sessions.get(sessionId);
        if (manager) {
            await manager.stop(); // You need to implement stop()
            this.sessions.delete(sessionId);
        }
    }
}
```

---

## 2. Horizontal Scaling (Multiple Servers)

When one server runs out of RAM (e.g., > 500 sessions), you need to add more servers.

### Sharding Strategy
You cannot have the same session active on two servers (WhatsApp will disconnect both). You must ensure **Session A always runs on Worker 1**.

#### Option A: Sticky Sessions (Simplest)
- Use a hash of the `sessionId` to determine which worker node handles it.
- `WorkerIndex = hash(sessionId) % TotalWorkers`

#### Option B: Dynamic Assignment (Robust)
- Store a "Session Registry" in Redis.
- `SET session:user123:node "worker-01"`
- When an API request comes in for `user123`, check Redis to see which node is hosting it.
- If no node is hosting, assign it to the least loaded node.

---

## 3. Message Queueing (The Buffer)

**Never** call `socket.sendMessage` directly from your HTTP API controller. If 1000 users send a message at once, your server will crash.

### Use a Queue (BullMQ / RabbitMQ)
1.  **API**: Receives `POST /send`. Pushes job to Queue: `{ sessionId: 'user1', to: '...', text: '...' }`.
2.  **Worker**: Consumes job.
    *   Checks if `sessions.has('user1')`.
    *   If not, loads it.
    *   Sends message.
    *   Updates job status.

```typescript
// Worker Code
worker.process('send-message', async (job) => {
    const { sessionId, content } = job.data;
    const manager = await orchestrator.getOrCreateSession(sessionId);
    await manager.sendMessage(content);
});
```

---

## 4. Database & Storage

### Auth State (Critical)
You **must** use Redis or a Database for auth state. File storage (`./auth_info`) will not work in a distributed environment (unless using a shared volume, which is slow/risky).
*   **Current Setup**: You already have `RedisDriver` implemented! This is perfect.

### Business Data
Use a relational DB (PostgreSQL/MySQL) for:
*   User metadata (subscription status, settings).
*   Message logs (who sent what, when).
*   Contacts/Groups cache.

---

## 5. Resource Limits & Safety

### Rate Limiting
WhatsApp has strict rate limits.
*   **Per Session**: Implement a local `PQueue` inside `BaileysManager` to limit outgoing messages (e.g., 5 per second).
*   **Global**: Use Redis to track total throughput.

### Memory Leaks
*   Baileys can leak memory if event listeners aren't cleaned up.
*   **Restart Strategy**: Implement a "Soft Restart" mechanism. Every 24 hours, gracefully disconnect and reconnect sessions to clear memory fragmentation.

---

## Summary Checklist for "Ideal" Setup

1.  ✅ **Redis Auth Store**: Implemented (v1.2.0).
2.  [ ] **Session Orchestrator**: Need to build a class to manage `Map<string, Manager>`.
3.  [ ] **HTTP API**: Need Express/Fastify/Hono to accept external requests.
4.  [ ] **Message Queue**: Need BullMQ to buffer outgoing messages.
5.  [ ] **Process Manager**: Use PM2 or Kubernetes to manage worker processes.

## Example: Multi-Session Manager

```typescript
export class MultiSessionManager {
    private sessions = new Map<string, BaileysManager>();

    async startSession(id: string) {
        if (this.sessions.has(id)) return;
        
        const manager = new BaileysManager(id);
        // Setup listeners...
        await manager.start();
        this.sessions.set(id, manager);
    }

    async broadcast(ids: string[], text: string) {
        for (const id of ids) {
            const session = this.sessions.get(id);
            if (session) {
                await session.sock?.sendMessage(id, { text });
            }
        }
    }
}
```
