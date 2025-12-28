# 05. Auth State Management

> **Tujuan**: Memahami struktur auth state dan kenapa ini adalah komponen paling kritis.

## 🔑 What is Auth State?

Auth state adalah **identity** dari WhatsApp bot Anda. Hilang = harus re-authenticate.

```
Auth State = {
  Who you are     (credentials)
  How to decrypt  (encryption keys)  
  Active sessions (connected users)
  Trust chain     (signal protocol data)
}
```

## 📦 Auth State Structure

```typescript
interface AuthenticationState {
  creds: AuthenticationCreds       // Device identity
  keys: SignalKeyStore             // Encryption keys
}

interface AuthenticationCreds {
  // Identity
  noiseKey: KeyPair                // WebSocket encryption
  signedIdentityKey: KeyPair       // Your device identity
  signedPreKey: SignedKeyPair      // Signed pre-key
  registrationId: number           // Unique device ID
  
  // User info
  me?: Contact                     // Your WhatsApp contact info
  
  // Keys for conversations
  firstUnuploadedPreKeyId: number  // Pre-key tracker
  nextPreKeyId: number             // Next pre-key to generate
  
  // Metadata
  registered: boolean              // Fully authenticated?
  pairingCode?: string            // For pairing auth
  routingInfo?: Buffer            // Server routing data
}

interface SignalKeyStore {
  get: (type, ids) => Promise<Record<string, any>>
  set: (data) => Promise<void>
}
```

## 🗂️ File Structure (Multi-File Auth State)

```
auth_folder/
├── creds.json                    ← Device credentials
├── pre-key-1.json               ← Pre-keys (1-100)
├── pre-key-2.json
├── session-1234567890.json      ← User sessions
├── session-9876543210.json
├── sender-key-group@g.us-user.json  ← Group keys
└── app-state-sync-key-xyz.json  ← App state sync
```

### creds.json Example
```json
{
  "noiseKey": {
    "private": "...",
    "public": "..."
  },
  "signedIdentityKey": {
    "private": "...",
    "public": "..."
  },
  "registrationId": 12345,
  "me": {
    "id": "1234567890@s.whatsapp.net",
    "name": "My Bot"
  },
  "registered": true
}
```

## 🔒 Why Auth State is Critical

### 1. **Losing = Re-auth Required**
```
Lost auth state → Scan QR code again → New device ID
```

### 2. **Security Implications**
```
Compromised auth state = Full account access
  - Can read messages
  - Can send messages as you
  - Can export chat history
```

### 3. **Multi-Device Limit**
```
WhatsApp allows: 1 phone + 4 linked devices
Lost auth = occupy new slot (total 5)
```

## 💾 Storage Strategies

### Option 1: File System (Development)
```typescript
const { state, saveCreds } = await useMultiFileAuthState('./auth')
```

**Pros**: Simple, built-in
**Cons**: Single point of failure, no HA

### Option 2: Database (Production)
```typescript
class DatabaseAuthState {
  async get(type, ids) {
    return await db.query(
      'SELECT id, data FROM auth_keys WHERE type = $1 AND id = ANY($2)',
      [type, ids]
    )
  }
  
  async set(data) {
    await db.transaction(async trx => {
      // Upsert keys
    })
  }
}
```

**Pros**: High availability, backup, audit
**Cons**: More complex

### Option 3: Redis (Distributed)
```typescript
const authCache = new Redis()

const state = {
  async get(type, ids) {
    const keys = ids.map(id => `auth:${type}:${id}`)
    return await authCache.mget(keys)
  },
  async set(data) {
    const pipeline = authCache.pipeline()
    // Batch set
    await pipeline.exec()
  }
}
```

**Pros**: Fast, distributed, TTL support
**Cons**: Volatile (need backup)

## ⚠️ Common Mistakes

### ❌ NOT saving credentials
```typescript
// WRONG
sock.ev.on('creds.update', () => {
  // Forgot to save!
})
```

### ✅ Always save
```typescript
// CORRECT
sock.ev.on('creds.update', saveCreds)
// or
sock.ev.process(async (events) => {
  if (events['creds.update']) {
    await saveCreds()
  }
})
```

## 🔄 Next Steps

- [06. Multi-File Auth State](./06-multi-file-auth.md) - Implementation details
- [07. Transaction System](./07-transaction-system.md) - Atomic operations
- [27. Database Integration](../06-production/27-database-integration.md) - Production setup
