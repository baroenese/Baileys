# Baileys Development Guide - Production Ready

> **Last Updated**: December 28, 2025  
> **Version**: 7.0.0-rc.9  
> **Module System**: Pure ESM

## � Quick Start for AI Agents

### ⚡ Critical Rules & Patterns
1. **Module System**: Pure ESM. **ALWAYS** use `.js` extensions for imports (e.g., `import { x } from './utils.js'`).
2. **Event Handling**: **NEVER** use `sock.ev.on()`. **ALWAYS** use `sock.ev.process(async (events) => { ... })` to handle batched events and ensure order.
3. **Socket Architecture**: `makeWASocket` uses a decorator pattern. Functionality is layered (Socket -> Chats -> Messages -> Groups -> Business -> Communities).
4. **Auth State**: Critical. Use `useMultiFileAuthState`. **NEVER** run multiple sockets with the same auth state simultaneously.
5. **Message Reliability**: You **MUST** implement `getMessage` in socket config to handle retries/decryption.
6. **Protobuf**: `WAProto` is auto-generated. **NEVER** edit `WAProto/*.js`. Run `yarn gen:protobuf` if `.proto` changes.
7. **Testing**:
   - Unit: `yarn test` (Mocked, fast).
   - E2E: `yarn test:e2e` (Real WhatsApp connection, requires `baileys_auth_info`).
8. **Code Style**: TypeScript, strict mode, `pino` for logging.

### 🛠️ Common Workflows
- **Start**: `yarn example` (Interactive, best for debugging).
- **Build**: `yarn build` (Uses `tsc-esm-fix`).
- **Lint**: `yarn lint:fix`.

### 📂 Key Files
- [Example/example.ts](../Example/example.ts): Reference implementation (shows 80% of use cases).
- [src/Socket/socket.ts](../src/Socket/socket.ts): Base connection logic.
- [src/Types/index.ts](../src/Types/index.ts): Type definitions.
- [src/Utils/use-multi-file-auth-state.ts](../src/Utils/use-multi-file-auth-state.ts): Auth implementation.

## �📚 Documentation System

**CRITICAL**: Comprehensive production documentation available in `docs/` directory with max 1000 lines per file for readability:
- **Production-ready code** - Real-world implementation with Hono.js framework
- **Complete examples** - Queue management, webhooks, authentication in `docs/whatsapp-api/`
- **Security patterns** - E2E encryption, rate limiting, error handling
- **Performance metrics** - Benchmarks and optimization tips

### Quick Access:
- 📖 [Complete Production Implementation](../docs/00-production-guide/production-implementation.md)
- 🔥 [Hono.js API Implementation](../docs/00-production-guide/hono-api-implementation.md)
- 📬 [Queue & Webhook System](../docs/00-production-guide/queue-webhook-system.md)
- 🔐 [Auth State Management](../docs/02-authentication/05-auth-state.md)
- 🚀 [WhatsApp API Quick Start](../docs/whatsapp-api/QUICK-START.md)
- 📦 [Full Implementation](../docs/whatsapp-api/) - Complete production app with Prisma, Redis, BullMQ

## Project Overview
Baileys is a production-grade TypeScript WebSocket library for WhatsApp Web multi-device API. It implements the complete WhatsApp Web protocol including:
- **E2E Encryption**: Full Signal Protocol implementation with multi-device support
- **Real-time Communication**: WebSocket-based bidirectional messaging
- **Protocol Abstraction**: Binary node encoding/decoding with Protobuf
- **State Management**: Transactional key store with atomic operations

**Use Cases**: Chatbots, customer service automation, business messaging platforms, notification systems.

**NOT Recommended For**: Spam, bulk messaging, or Terms of Service violations.

## Core Architecture

### Socket Layer Composition (Decorator Pattern)
The main `makeWASocket()` function ([src/Socket/index.ts](../src/Socket/index.ts)) uses a **decorator pattern** to compose socket layers. Each layer wraps the previous, inheriting all methods and adding new ones:

```typescript
makeSocket()                  // Layer 0: WebSocket, Noise Protocol, Auth
  └─ makeChatsSocket()        // Layer 1: Chat management, message reception
      └─ makeMessagesRecvSocket() // Layer 2: Message decryption
          └─ makeMessagesSocket() // Layer 3: Message sending, encryption
              └─ makeGroupsSocket() // Layer 4: Group operations
                  └─ makeBusinessSocket() // Layer 5: Business features
                      └─ makeNewsletterSocket() // Layer 6: Channels
                          └─ makeCommunitiesSocket() // Layer 7: Final API (exported)
```

**Why This Matters**: Each layer can access methods from all previous layers. When debugging, trace the call stack from top to bottom. When adding features, extend the appropriate layer. See [src/Socket/communities.ts](../src/Socket/communities.ts) which imports from `business.ts`, which imports from `newsletter.ts`, etc.

### Base Socket Layer (makeSocket)
Located in [src/Socket/socket.ts](../src/Socket/socket.ts), handles:
- **WebSocket Lifecycle**: Connection, keepalive, reconnection with exponential backoff
- **Noise Protocol**: XX pattern for key exchange and encryption
- **Binary Node Protocol**: Low-level communication primitives
- **Query System**: Request-response pattern with timeout handling
- **Event Bus**: EventEmitter for `connection.update`, `creds.update`, etc.

**Key Functions**:
- `query()`: Send binary node and wait for response (with timeout)
- `sendNode()`: Fire-and-forget binary node send
- `waitForMessage()`: Wait for specific incoming message pattern
- `uploadPreKeys()`: Manage Signal protocol pre-keys (min threshold: 5)

### Authentication & State Management

**Critical**: Auth state is the foundation of the entire system. Losing it means re-authentication.

#### Multi-File Auth State ([src/Utils/use-multi-file-auth-state.ts](../src/Utils/use-multi-file-auth-state.ts))
```typescript
const { state, saveCreds } = await useMultiFileAuthState('./auth_folder')
```

**The Heart of Security**: All E2E encryption happens here ([src/Signal/](../src/Signal/)).

#### libsignal Integration ([src/Signal/libsignal.ts](../src/Signal/libsignal.ts))
- **1:1 Encryption**: X3DH key agreement + Double Ratchet algorithm
- **Group Encryption**: Sender Keys (one symmetric key per sender per group)
- **Device Management**: Each user can have multiple devices (phone, web, desktop)

**Message Flow**:
1. Sender creates `ciphertext` using recipient's session
2. Protobuf encodes to `proto.Message.AppStateSyncKeyShare` or similar
3. Binary node wraps and sends via WebSocket
4. Receiver decrypts using their session
5. Update session state (ratcheting forward)

#### LID (Lightweight Identity) Mapping ([src/Signal/lid-mapping.ts](../src/Signal/lid-mapping.ts))
**Problem**: WhatsApp multi-device uses two JID types:
- **PN (Phone Number)**: `1234567890@s.whatsapp.net`
- **LID (Lightweight ID)**: `abc123xyz@lid`

**Solution**: LIDMappingStore maintains bidirectional mapping with LRU cache + database fallback.

**When It Matters**: 
- Sending to users with multiple devices
- Group messages (each participant may have LID)
- Encryption key lookups

**API**:
```typescript
// Get LID for phone number (returns device-specific LID)
const lid = await lidMapping.getLIDForPN('1234567890:0@s.whatsapp.net')
// Returns: 'abc123xyz:0@lid'
```

#### Pre-Key Management ([src/Utils/pre-key-manager.ts](../src/Utils/pre-key-manager.ts))
**Critical for Security**: Pre-keys allow others to establish sessions with you.

**Lifecycle**:
1. Generate 100 pre-keys on registration
2. Upload to WhatsApp servers
3. Server distributes to users wanting to message you
4. When count drops below 5, auto-upload new batch
5. Used pre-keys are deleted (one-time use)
 Deep Dive

#### WABinary - Wire Format ([src/WABinary/](../src/WABinary/))
**What**: Custom binary protocol for efficient data transmission (much smaller than JSON).

**Structure**:
```typescript
type BinaryNode = {
  tag: string           // e.g., 'message', 'iq', 'presence'
  attrs: { [k: string]: any }  // Attributes
  content: BinaryNode[] | Buffer | string | undefined
}
```

**Example**:
```typescript
// Send a message acknowledgment
const ackNode: BinaryNode = {
  tag: 'ack',
  attrs: { class: 'receipt', id: messageId, to: jid },
  content: undefined
}
await sendNode(ackNode)
```

**Token Compression**: Common strings are replaced with single-byte tokens (e.g., "message" → 0x01). See [src/WABinary/constants.ts](../src/WABinary/constants.ts).

#### JID (Jabber ID) Formats
- `1234567890@s.whatsapp.net` - User (phone number)
- `1234567890:0@s.whatsapp.net` - User with device (0 = main device)
- `123456789@g.us` - Group
- `abc@lid` - Lightweight ID (multi-device)
- `xyz@newsletter` - Newsletter/Channel
- `1234567890:99@hosted` - Hosted device (enterprise)
- `status@broadcast` - Status/Stories

**Critical Functions**:
- `jidNormalizedUser()`: Normalize before database storage (removes device)
- `areJidsSameUser()`: Compare ignoring device numbers
- `jidDecode()`: Parse components (user, device, server, domainType)

#### WAProto - Protobuf Definitions ([WAProto/](../WAProto/))
**Autogenerated Code**: Never manually edit `index.js` or `index.d.ts`.

**Usage**:
```typescript
import { proto } from '@whiskeysockets/baileys'

// Create a text message
const message = proto.Message.create({
  conversation: 'Hello World',
  messageTimestamp: Date.now()
})
Local Development Setup
```bash
# Clone and install
git clone https://github.com/WhiskeySockets/Baileys.git
cd Baileys
yarn install

# Build library
yarn build        # Compile TypeScript → lib/ directory
                  # Uses tsc + tsc-esm-fix for ESM compatibility

# Run example (best way to understand the library)
yarn example      # Starts interactive session
                  # Add --use-pairing-code for pairing code auth
                  # Add --do-reply to auto-reply to messages
```

### Testing Strategy
```bash
# Unit tests (fast, no external dependencies)
yarn test         # Runs *.test.ts files

# E2E tests (requires real WhatsApp connection)
yarn test:e2e     # Runs *.test-e2e.ts - BE CAREFUL!

# Test structure
# - Unit tests in src/__tests__/ alongside source
# - Shared utilities in src/__tests__/TestUtils/session.ts
# - Mock libsignal for unit tests to avoid crypto overhead
```

**Important**: E2E tests use real WhatsApp connection in `baileys_auth_info/`. Never run in CI/CD.

### Debugging Workflows
```bash
# Run example with trace logging
LOG_LEVEL=trace yarn example

# Debug specific test
node --inspect-brk --experimental-vm-modules ./node_modules/.bin/jest --testMatch '**/your-test.test.ts'

# Debug with VS Code
# Add breakpoint, press F5 (launch.json configured for TypeScript)

# Trace WebSocket traffic
# Set logger level to 'trace' to see all binary nodes sent/received
```

**Common Debug Scenarios**:
- **Connection issues**: Check `connection.update` events, verify auth state exists
- **Message not sending**: Enable trace logging, check binary node output
- **Decryption failures**: Verify `getMessage` is implemented, check session keys
- **Pre-key errors**: Check `uploadPreKeysToServerIfRequired()` logs
   Professional Implementation Patterns

### Production-Grade Event Handling
```typescript
// CORRECT: Batched, efficient, error-tolerant
sock.ev.process(async (events) => {
  try {
    // Credentials updates are CRITICAL - never skip
    if (events['creds.update']) {
      await saveCreds()
    }

    // Message handling with error isolation
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert']
      
      for (cStore & Retry System

**Why Critical**: WhatsApp may ask for message retransmission if decryption fails. Without a store, you can't comply and lose messages.

#### Implementing getMessage
```typescript
// Message store (use your database)
const messageStore = new Map<string, proto.IWebMessageInfo>()

const sock = makeWASocket({
  // REQUIRED for production
  getMessage: async (key: WAMessageKey) => {
    const msgId = `${key.remoteJid}:${key.id}`
    const msg = await database.messages.findOne({ id: msgId })
    
    if (!msg) {
      logger.warn({ key }, 'Message not found for retry')
      return undefined
    }
    
    return msg.message  // Return proto.IMessage
  },
  
  // Track retry attempts
  msgRetryCounterCache: new NodeCache({
    stdTTL: 3600,  // 1 hour
    checkperiod: 600
  })
})

// Store messages when they arrive
sock.ev.process(async (events) => {
  if (events['messages.upsert']) {
    for (const msg of events['messages.upsert'].messages) {
      await database.messages.insert({
        id: `${msg.key.remoteJid}:${msg.key.id}`,
        message: msg.message,
        timestamp: msg.messageTimestamp
      })
    }
  }
})
```

**Advanced**: Use PostgreSQL with JSONB column for message content, indexed on `remoteJid` + `id`.

#### Message Retry Flow
1. Recipient fails to decrypt message
2. Sends retry request to sender
3. Baileys calls your `getMessage()` with original message key
4. Re-encrypt with fresh keys and resend
5. `msgRetryCounterCache` prevents infinite loops (max 5 retries)   if (connection === 'close') {
        const shouldReconnect = 
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        
        if (shouldReconnect) {
          logger.info('Reconnecting...')
          setTimeout(() => startSocket(), 3000)
        } else {
          logger.error('Logged out, stopping')
        }
      }
      
      if (qr) {
        // Display QR or save to database
        console.log('QR Code:', qr)
      }
    }

    // Group updates - refresh metadata
    if (events['groups.update']) {
      for (const update of events['groups.update']) {
        const metadata = await sock.groupMetadata(update.id)
        await cacheGroupMetadata(update.id, metadata)
      }
    }

    // Presence updates (typing indicators)
    if (events['presence.update']) {
      const { id, presences } = events['presence.update']
      // Handle typing indicators, online status
    }

  } catch (err) {
    logger.error({ err }, 'Event processing failed')
  }Performance Optimization: Caching Strategy

**Rule**: Cache everything that's expensive to fetch and doesn't change often.

#### Essential Caches
```typescript
import NodeCache from '@cacheable/node-cache'

// 1. Message retry counter (REQUIRED)
const msgRetryCounterCache = new NodeCache({ 
  stdTTL: 3600,
  useClones: false  // Performance: don't deep clone
})

// 2. User devices (highly recommended)
const userDevicesCache = new NodeCache({ 
  stdTTL: 300,  // 5 minutes
  useClones: false
})

// 3. Group metadata (critical for group chats)
const groupMetadataCache = new NodeCache({ 
  stdTTL: 300,
  useClones: false
})

const sock = makeWASocket({
  msgRetryCounterCache,
  userDevicesCache,
  cProduction Best Practices

### Architecture Patterns

#### 1. Multi-Instance Deployment
**Challenge**: Running multiple Baileys instances with one WhatsApp account = BAN.

**Solutions**:
```typescript
// Option A: One instance per account (recommended)
const instances = new Map<string, WASocket>()

async function getOrCreateSocket(phoneNumber: string) {
  if (!instances.has(phoneNumber)) {
    const sock = await createSocket(`./auth_${phoneNumber}`)
    instances.set(phoneNumber, sock)
  }
  return instances.get(phoneNumber)
}

// Option B: Queue-based (single instance, multiple workers)
const messageQueue = new Queue('whatsapp-messages', {
  connection: redis
})

// Worker 1: Runs socket
await startSocket()

// Worker 2-N: Add to queue
await messageQueue.add('send', { to: jid, message: 'Hi' })
```

#### 2. Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...')
  
  // Close socket cleanly
  sock.end(undefined)
  
  // Wait for pending operations
  await pendingOperations.allSettled()
  
  // Close database connections
  await database.close()
  
  process.exit(0)
})
```

#### 3. Message Rate Limiting
```typescript
import PQueue from 'p-queue'

// Prevent WhatsApp rate limits
const sendQueue = new PQueue({
  interval: 1000,    // 1 second
  intervalCap: 20    // Max 20 messages per second
})

async function sendMessage(jid: string, text: string) {
  return sendQueue.add(() => sock.sendMessage(jid, { text }))
}
```

#### 4. Error Recovery Strategies
```typescript
const MAX_RETRIES = 3
const RETRY_DELAY = 5000

async function robustSendMessage(jid: string, content: any, retries = 0) {
  try {
    return await sock.sendMessage(jid, content)
  } catch (err) {
    if (retries < MAX_RETRIES) {
      logger.warn({ err, retries }, 'Send failed, retrying...')
      await delay(RETRY_DELAY * (retries + 1))
      return robustSendMessage(jid, content, retries + 1)
    }
    
    // Dead letter queue for failed messages
    await failedMessageQueue.add({ jid, content, error: err.message })
    throw err
  }
}
```

### Monitoring & Observability

#### Key Metrics to Track
```typescript
// 1. Connection uptime
const connectionMetrics = {
  connected: Date.now(),
  disconnections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0
}

// 2. Message latency
const sendLatency = new Histogram('message_send_duration_ms')
const start = Date.now()
await sock.sendMessage(jid, message)
sendLatency.observe(Date.now() - start)

// 3. Auth state changes
sock.ev.process(async (events) => {
  if (events['creds.update']) {
    metrics.increment('auth.creds_updated')
  }
})

// 4. Pre-key exhaustion
// Watch logs for "uploading pre keys" - if too frequent, investigate
```

#### Structured Logging
```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      { target: 'pino-pretty', level: 'debug' },  // Console
      { target: 'pino/file', options: { destination: './logs/app.log' } }
    ]
  }
})

const sock = makeWASocket({ 
  logger: logger.child({ module: 'baileys' })
})
```

## Example Production Implementation

### Minimal Stable Implementation (docs/whatsapp-api/)
A **production-ready minimal implementation** (~920 lines total) focused on connection stability and session management. This is NOT a full REST API but a reference implementation showing proper patterns:

**Key Features**:
- 🔄 Auto-reconnection with exponential backoff (1s → 30s max)
- 💾 Message retry support with in-memory history (last 1000 messages)
- ⚡ Performance optimized with 3-tier caching strategy
- 📊 Built-in metrics tracking (messages, errors, uptime)
- 🛡️ Error isolation - one failing event won't crash others
- 🔐 Multi-file auth state for efficient session management
- 📝 Structured logging with Pino (console + file)
- 🎯 Interactive CLI for easy testing

**Architecture** (`docs/whatsapp-api/src/`):
- `baileys-manager.ts` - Core connection handler (500 lines)
- `session-store.ts` - Auth state persistence (60 lines)
- `config.ts` - Configuration management (50 lines)
- `index.ts` - Entry point with CLI (200 lines)

**Quick Start**:
```bash
cd docs/whatsapp-api
pnpm install
pnpm dev              # Development with auto-reload
pnpm dev:debug        # Trace-level logging
pnpm start            # Production mode
```

**Interactive CLI Commands**:
```
status  - Show connection status and metrics
send    - Send test message
metrics - Show detailed metrics
help    - Show help
exit    - Exit program
```

**Configuration** (`.env` or environment variables):
```env
BAILEYS_LOG_LEVEL=info
BAILEYS_AUTH_FOLDER=./auth_sessions
MAX_RECONNECT_ATTEMPTS=10
SYNC_FULL_HISTORY=false
AUTO_READ_MESSAGES=true
```

**Why This Instead of Full API?**: This implementation shows the correct patterns for:
- Connection lifecycle management
- Event handling with error isolation
- Proper caching strategy
- Reconnection logic
- Metrics tracking

For a full REST API, extend this foundation with your preferred framework (Hono, Express, Fastify).

## Common Gotchas & Debugging

### 1. "Connection Closed" Loop
**Symptom**: Socket connects then immediately disconnects.

**Causes**:
- Using same auth state in multiple instances simultaneously
- Corrupted auth state files
- IP banned due to rate limiting

**Fix**:
```typescript
// Check disconnect reason
if (connection === 'close') {
  const statusCode = lastDisconnect?.error?.output?.statusCode
  
  switch (statusCode) {
    case DisconnectReason.badSession:
      logger.error('Bad session, deleting auth state')
      await deleteAuthState()
      break
    case DisconnectReason.connectionClosed:
      logger.warn('Connection closed, reconnecting...')
      break
    case DisconnectReason.loggedOut:
      logger.error('Logged out by user')
      break
    default:
      logger.error({ statusCode }, 'Unknown disconnect')
  }
}
```

### 2. Messages Not Decrypting
**Symptom**: Receiving `proto.Message` but content fields are undefined.

**Causes**:
- Session not established (missing pre-key)
- Transaction not used during decryption
- LID mapping not resolved

**Fix**:
```typescript
// Ensure getMessage is implemented
const sock = makeWASocket({
  getMessage: async (key) => {
    // Must return previously received message
    return await messageStore.get(key)
  }
})
```

### 3. Group Message Send Fails
**Symptom**: `Error: could not find group metadata`

**Fix**:
```typescript
// ALWAYS cache group metadata
const metadata = await sock.groupMetadata(groupJid)
groupCache.set(groupJid, metadata)

// Then send
await sock.sendMessage(groupJid, { text: 'Hello group!' })
```

### 4. Pre-Key Exhaustion
**Symptom**: Can't receive messages from new contacts.

**Monitoring**:
```typescript
// Check auth state
const preKeyCount = creds.nextPreKeyId - creds.firstUnuploadedPreKeyId
if (preKeyCount < 10) {
  logger.warn({ preKeyCount }, 'Low pre-key count!')
}
```

**Auto-handled**: Baileys uploads new pre-keys automatically when count < 5.

### 5. Media Upload Failures
**Symptom**: Image/video messages fail with timeout.

**Fix**:
```typescript
import { uploadMedia } from './media-uploader'

// Implement retry logic
const mediaCache = new NodeCache({ stdTTL: 3600 })

const sock = makeWASocket({
  mediaCache,  // Avoids re-upload
  options: {
    timeout: 60000  // Increase timeout for large files
  }
})
```

## Advanced Topics & Internals

### Binary Node Deep Dive
**What**: WABinary is WhatsApp's custom protocol - much more efficient than JSON (5-10x smaller).

**Token Compression**: Common strings are replaced with single bytes (defined in [src/WABinary/constants.ts](../src/WABinary/constants.ts)):
- Single-byte tokens: Index 0-255 (e.g., `'message'` → byte 18)
- Double-byte tokens: 4 dictionaries × 256 entries (e.g., `'reaction'` → `[236, 4]`)

**When to use**:
- Custom IQ queries (presence, status, user info)
- Implementing new WhatsApp features before library support
- Debugging protocol-level issues

### Custom Binary Node Operations
```typescript
// Example: Request user status
const statusNode: BinaryNode = {
  tag: 'iq',
  attrs: {
    id: generateMessageTag(),
    type: 'get',
    xmlns: 'status',
    to: jidEncode(user, 's.whatsapp.net')
  },
  content: undefined
}

const response = await sock.query(statusNode)
const status = getBinaryNodeChild(response, 'status')?.content?.toString()
```

### Signal Protocol Transaction Internals
**Why transactions matter**: Pre-key operations must be atomic to prevent:
- **ID collisions**: Two processes generating same pre-key ID
- **Race conditions**: Session creation interrupted mid-operation
- **Data corruption**: Partial writes to key store

**How it works** ([src/Utils/auth-utils.ts](../src/Utils/auth-utils.ts)):
1. `AsyncLocalStorage` provides automatic context propagation
2. Mutex ensures only one transaction per key type at a time
3. In-memory cache holds changes until commit
4. Retry logic with exponential backoff (configurable)

**Performance impact**: ~5-10ms overhead, but prevents subtle bugs that are hard to debug.

### LID Migration Deep Dive
**Problem**: WhatsApp's multi-device uses LID (Lightweight ID) for privacy. When a user migrates to multi-device, their sessions need migration from PN to LID.

**Migration Flow** ([src/Signal/libsignal.ts](../src/Signal/libsignal.ts)):
1. Detect PN → LID mapping via USync query
2. Store mapping in `lid-mapping` table (bidirectional)
3. Copy session from PN address to LID address (with device preservation)
4. Delete old PN session
5. Cache migration in LRU (7-day TTL) to avoid redundant work

**Critical**: Migration is device-specific. User `1234567890` with devices [0, 1, 99] requires 3 separate session migrations.

### Implementing Custom Auth Backend
```typescript
import { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys'

class DatabaseAuthState implements AuthenticationState {
  creds: AuthenticationCreds
  
  keys = {
    async get(type: keyof SignalDataTypeMap, ids: string[]) {
      // Fetch from database
      const rows = await db.query(
        'SELECT id, data FROM signal_keys WHERE type = $1 AND id = ANY($2)',
        [type, ids]
      )
      return Object.fromEntries(rows.map(r => [r.id, r.data]))
    },
    
    async set(data: SignalDataSet) {
      // Upsert to database with transaction
      await db.transaction(async (trx) => {
        for (const [type, items] of Object.entries(data)) {
          for (const [id, value] of Object.entries(items)) {
            await trx.query(
              'INSERT INTO signal_keys (type, id, data) VALUES ($1, $2, $3) ON CONFLICT (type, id) DO UPDATE SET data = $3',
              [type, id, value]
            )
          }
        }
      })
    }
  }
}
```

### WebHook Integration Pattern
```typescript
// Receive messages → Forward to webhook
sock.ev.process(async (events) => {
  if (events['messages.upsert']) {
    for (const msg of events['messages.upsert'].messages) {
      await fetch('https://your-api.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: msg.key.remoteJid,
          message: msg.message,
          timestamp: msg.messageTimestamp
        })
      })
    }
  }
})
```
sock.ev.process(async (events) => {
  if (events['groups.update']) {
    for (const { id } of events['groups.update']) {
      const metadata = await sock.groupMetadata(id)
      groupMetadataCache.set(id, metadata)
    }
  }
  
  if (events['group-participants.update']) {
    const { id } = events['group-participants.update']
    const metadata = await sock.groupMetadata(id)
    groupMetadataCache.set(id, metadata)
  }
})
```

#### Impact Metrics
- **Without caching**: ~500ms per message send (device lookup + metadata)
- **With caching**: ~50ms per message send (10x faster)
- **Group messages**: Without cache, N queries per message (N = participants)

#### Redis for Multi-Instance
```typescript
import Redis from 'ioredis'

const redis = new Redis()

const distributedCache: CacheStore = {
  async get(key) {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : undefined
  },
  async set(key, value) {
    await redis.setex(key, 300, JSON.stringify(value))
  },
  async del(key) {
    await redis.del(key)
  },
  async flushAll() {
    await redis.flushdb()
  }
}
```
```typescript
// ❌ DON'T DO THIS
sock.ev.on('messages.upsert', handler1)
sock.ev.on('messages.upsert', handler2)  // Both fire concurrently!`src/__tests__/TestUtils/session.ts`: Shared test utilities
- Mock libsignal for unit tests to avoid slow crypto
- E2E tests use real WhatsApp connection (be careful!)

**Regeneration** (when `.proto` file changes):
```bash
yarn gen:protobuf  # Calls pbjs + pbts + fix-imports.js
```

#### WAM - Analytics ([src/WAM/](../src/WAM/))
**Purpose**: WhatsApp collects anonymous usage metrics. Baileys can encode these.

**Example**: `BinaryInfo` tracks WebSocket connection metrics (platform, version, etc.).

#### WAUSync - User Sync ([src/WAUSync/](../src/WAUSync/))
**Purpose**: Query user information (profile, devices, status).

**Classes**:
- `USyncQuery`: Batch user queries (efficient bulk lookups)
- `USyncUser`: Individual user info fetch

**Use Case**: Before sending a message, fetch user's device list to encrypt for all devices.
- Multi-instance support with distributed locking
- Audit logging

#### Cacheable Key Store ([src/Utils/auth-utils.ts](../src/Utils/auth-utils.ts))
```typescript
keys: makeCacheableSignalKeyStore(state.keys, logger)
```

**Purpose**: Reduces disk I/O by caching keys in memory (LRU cache, 5-minute TTL). Essential for high-throughput applications.

#### Transaction System ([src/Utils/auth-utils.ts](../src/Utils/auth-utils.ts))
```typescript
// Atomic operations using AsyncLocalStorage
await keys.transaction(async () => {
  // All key operations here are atomic
  await keys.set({ 'pre-key': { '1': keyPair } })
}, transactionKey)
```

**Why**: Signal protocol requires atomic operations for security. Example: session establishment must not be interrupted.

**Implementation**: Uses `AsyncLocalStorage` for context propagation + mutex for exclusivity. Retry logic with configurable attempts.

**When to Use Transactions**:
- ✅ Pre-key generation and upload (prevents ID collisions)
- ✅ Session encryption/decryption (prevents race conditions)
- ✅ Group encryption with sender keys
- ✅ LID-PN mapping updates
- ❌ Simple key reads (transactions are for writes)
- ❌ Nested transactions (reuses existing context automatically)

**Performance**: Transactions batch database writes but add ~5-10ms overhead. Critical for correctness, not performance.

### Signal Protocol Implementation  
- Located in [src/Signal/](../src/Signal/) - handles E2E encryption
- Uses libsignal for encryption/decryption with WhatsApp-specific extensions
- Group encryption uses Sender Keys ([src/Signal/Group/](../src/Signal/Group/))
- LID (Lightweight Identity) mapping for multi-device support ([src/Signal/lid-mapping.ts](../src/Signal/lid-mapping.ts))
- All encryption operations wrapped in transactions for atomicity

### WhatsApp Protocol
- **WABinary**: Binary node encoding/decoding ([src/WABinary/](../src/WABinary/))
  - `encodeBinaryNode()` and `decodeDecompressedBinaryNode()` for wire format
  - JID utilities: `jidEncode()`, `jidDecode()` for WhatsApp IDs
  - JID formats: `user@s.whatsapp.net` (DM), `group@g.us` (group), `@lid` (lightweight ID), `@newsletter` (channels)
- **WAProto**: Protobuf definitions ([WAProto/](../WAProto/))
  - Generated from `WAProto.proto` using `yarn gen:protobuf`
  - Access via `proto` namespace (e.g., `proto.Message`)
- **WAM**: WhatsApp Analytics Messages ([src/WAM/](../src/WAM/))
- **WAUSync**: User sync protocol ([src/WAUSync/](../src/WAUSync/))

## Development Workflows

### Build & Test
```bash
yarn build        # Compile TypeScript (outputs to lib/)
yarn test         # Run unit tests (*.test.ts)
yarn test:e2e     # Run E2E tests (*.test-e2e.ts) - requires auth
yarn example      # Run example.ts (best quickstart reference)
```

### Protobuf Regeneration
When `WAProto.proto` changes:
```bash
yarn gen:protobuf   # Runs WAProto/GenerateStatics.sh
```
This generates TypeScript definitions and runtime code. Never manually edit `WAProto/index.js` or `WAProto/index.d.ts`.

### Module System
- **Pure ESM project** - uses `"type": "module"` in package.json
- Import extensions required: `.js` in imports (TypeScript compiles to `.js`)
- `tsc-esm-fix` post-processes builds to fix ESM issues
- Test setup uses `ts-jest` with ESM preset (see [jest.config.ts](../jest.config.ts))
- **Critical**: Always use `.js` extensions in import statements, even for `.ts` files
  ```typescript
  // ✅ CORRECT
  import { something } from './utils/helpers.js'
  
  // ❌ WRONG
  import { something } from './utils/helpers'
  import { something } from './utils/helpers.ts'
  ```

### TypeScript Configuration
- Target: ES2020, Module: ESNext
- **verbatimModuleSyntax**: `true` - strict ESM compliance
- **allowImportingTsExtensions**: `true` - allows `.ts` in dev
- **noEmit**: `true` in main config (use tsconfig.build.json for compilation)
- Strict mode enabled with `noUncheckedIndexedAccess`
- Uses `bundler` moduleResolution for better import handling

## Critical Patterns

### Event Handling
```typescript
// Use ev.process() for batched event handling
sock.ev.process(async (events) => {
  if (events['messages.upsert']) {
    const { messages } = events['messages.upsert']
    // Process messages
  }
  if (events['creds.update']) {
    await saveCreds() // Always save credential updates
  }
})
```

### Message Retry & getMessage
Implement `getMessage` callback in socket config for:
- Message retry when decryption fails
- Poll vote decryption
- Quote message context

```typescript
const sock = makeWASocket({
  getMessage: async (key) => {
    // Fetch message from your store using key.remoteJid and key.id
    return messageFromStore
  },
  msgRetryCounterCache // CacheStore for retry tracking
})
```

### Caching Recommendations
- **msgRetryCounterCache**: Required for message retry logic (use `NodeCache`)
- **userDevicesCache**: Caches user device lists (speeds up encryption)
- **cachedGroupMetadata**: Critical for group operations (prevents repeated queries)
- See [Example/example.ts](../Example/example.ts) for complete cache setup

### Binary Node Communication
When implementing custom functionality with `sendNode()` or handling WebSocket events:
```typescript
const node: BinaryNode = {
  tag: 'iq',
  attrs: { id: messageTag, type: 'get', xmlns: 'namespace' },
  content: [/* child nodes */]
}
const response = await query(node)
```

## Testing Conventions
- **Unit tests**: Located in `src/__tests__/` directories alongside source code
  - Naming: `*.test.ts` (run with `yarn test`)
  - Use `src/__tests__/TestUtils/session.ts` helpers for test setup
  - Mock libsignal for unit tests to avoid crypto overhead (much faster)
- **E2E tests**: Integration tests requiring real WhatsApp connection
  - Naming: `*.test-e2e.ts` (run with `yarn test:e2e`)
  - Require valid auth state in `baileys_auth_info/` folder
  - **NEVER run in CI/CD** - will get your number banned
  - Use carefully with test numbers only
- **Test runner**: Jest with ts-jest and ESM support
  - Config: [jest.config.ts](../jest.config.ts)
  - Uses `node --experimental-vm-modules` for ESM
  - Transform both `.ts` and `.js` files
- **Coverage**: Not enforced, but aim for critical paths (encryption, auth, message handling)

## Code Style
- ESLint config from `@whiskeysockets/eslint-config`
- Prettier fo & Linting
- **ESLint**: ESM flat config ([eslint.config.mts](../eslint.config.mts)) with TypeScript plugin
- **Prettier**: Integrated via `eslint-plugin-prettier` for consistent formatting
- **Commands**:
  - `yarn lint` - Type check + lint
  - `yarn lint:fix` - Auto-fix issues
  - `yarn format` - Format code with Prettier
- **Conventions**:
  - Prefer explicit types over `any` (warn-level rule)
  - camelCase for variables, PascalCase for types/interfaces
  - Use `readonly` for immutable properties
  - Arrow functions for callbacks, regular functions for method
- **Path separators**: Use Node's `path.join()` for cross-platform paths
- **Auth folder paths**: Use relative paths like `./auth_sessions` (works on all platforms)
- **Line endings**: Git auto-converts CRLF ↔ LF (configured in `.gitattributes`)
- **Redis**: Use Memurai or WSL for Windows development
- **PostgreSQL**: Recommend using port 5433 to avoid conflicts with system services
- **Podman vs Docker**: Prefer Podman on Windows for better WSL2 integration

## Common Gotchas & Anti-Patterns

### ❌ DON'T: Run multiple instances with same auth state
```typescript
// WRONG - will cause constant disconnections and potential ban
const sock1 = makeWASocket({ auth: state1 })
const sock2 = makeWASocket({ auth: state1 }) // SAME STATE!
```
**Why**: WhatsApp detects concurrent sessions and will disconnect both.

### ✅ DO: Use separate auth folders per instance
```typescript
// CORRECT
const sock1 = makeWASocket({ auth: await useMultiFileAuthState('./auth_1') })
const sock2 = makeWASocket({ auth: await useMultiFileAuthState('./auth_2') })
```

### ❌ DON'T: Ignore getMessage implementation
```typescript
// WRONG - messages will fail to decrypt on retry
const sock = makeWASocket({ auth: state })
```
**Result**: Lost messages when WhatsApp requests retransmission.

### ✅ DO: Always implement getMessage
```typescript
// CORRECT - enables message retry
const sock = makeWASocket({
  auth: state,
  getMessage: async (key) => await db.getMessage(key)
})
```

### ❌ DON'T: Use .on() for event handling
```typescript
// WRONG - events fire concurrently, race conditions
sock.ev.on('messages.upsert', handler1)
sock.ev.on('messages.upsert', handler2)
```

### ✅ DO: Use .process() for batched events
```typescript
// CORRECT - batched, sequential, efficient
sock.ev.process(async (events) => {
  if (events['messages.upsert']) {
    // Handle messages
  }
  if (events['creds.update']) {
    await saveCreds() // Always save!
  }
})
```
