# 01. Project Overview

> **Tujuan**: Memahami big picture Baileys dan kenapa arsitekturnya didesain seperti ini.

## 🎯 What is Baileys?

Baileys adalah **TypeScript WebSocket library** untuk berinteraksi dengan WhatsApp Web API tanpa menggunakan browser.

```
┌─────────────────────────────────────────────────┐
│           Your Application (Bot/Service)         │
└────────────────┬────────────────────────────────┘
                 │
                 │ (uses Baileys)
                 ▼
┌─────────────────────────────────────────────────┐
│              Baileys Library                     │
│  ┌──────────────────────────────────────────┐  │
│  │  Socket Layers (7 layers)                │  │
│  │  - WebSocket Connection                  │  │
│  │  - Noise Protocol (Encryption)           │  │
│  │  - Signal Protocol (E2E)                 │  │
│  │  - Binary Node Protocol                  │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │
                 │ (WebSocket + Binary Protocol)
                 ▼
┌─────────────────────────────────────────────────┐
│         WhatsApp Web Servers                     │
└─────────────────────────────────────────────────┘
```

## 🏗️ Core Components

### 1. Socket System (7 Layers)
**Location**: `src/Socket/`

Setiap layer menambahkan fungsi spesifik:
```
Layer 0: makeSocket()           → WebSocket, Auth
Layer 1: makeMessagesRecvSocket() → Receive & Decrypt
Layer 2: makeMessagesSocket()    → Send & Encrypt  
Layer 3: makeGroupsSocket()      → Groups
Layer 4: makeChatsSocket()       → Chats
Layer 5: makeBusinessSocket()    → Business
Layer 6: makeNewsletterSocket()  → Channels
Layer 7: makeCommunitiesSocket() → Final API
```

**Why 7 layers?**: Separation of concerns - setiap layer punya tanggung jawab jelas.

### 2. Authentication System
**Location**: `src/Utils/use-multi-file-auth-state.ts`

```typescript
// Auth state contains:
- Credentials (device identity)
- Signal keys (encryption)
- Session data (active connections)
- Pre-keys (for new conversations)
```

### 3. Signal Protocol
**Location**: `src/Signal/`

WhatsApp menggunakan **Signal Protocol** untuk E2E encryption:
- Same protocol as Signal app
- X3DH key agreement
- Double Ratchet algorithm
- Forward secrecy

### 4. Binary Protocol
**Location**: `src/WABinary/`

WhatsApp tidak menggunakan JSON, tapi binary format:
```
JSON:   {"message": "hello"}     → 23 bytes
Binary: [0x01, 0x48, 0x65...]    → 7 bytes
        ↑ 3x lebih kecil!
```

## 💡 Why Baileys, Not Browser Automation?

| Aspect | Baileys | Puppeteer/Selenium |
|--------|---------|-------------------|
| Memory | ~50 MB | ~500 MB |
| CPU | Minimal | Heavy |
| Speed | Fast | Slow |
| Reliability | High | Medium |
| Setup | Simple | Complex |

## 🎓 Key Concepts

### Multi-Device Support
WhatsApp multi-device = 1 phone + 4 linked devices
```
Phone (Primary)
  ├── Web Browser 1
  ├── Desktop App
  ├── Web Browser 2
  └── Baileys (Your Bot) ← We are here
```

### Stateful Connection
- Auth state must be preserved
- Losing auth = re-scan QR code
- Sessions are per-user

## 📊 Performance Characteristics

```
Typical Message Send: 50-200ms
Connection Setup: 2-5 seconds
Memory Usage: 50-100 MB per instance
Concurrent Messages: 100+ msg/sec (with rate limit)
```

## ⚠️ Important Limitations

1. **One instance per account** - Multiple = BAN
2. **Rate limits exist** - Max ~20 msg/sec
3. **No phone number spoofing** - Must own the number
4. **Terms of Service** - No spam/abuse

## 🔄 Next Steps

Continue to:
- [02. Socket Layer Architecture](./02-socket-layers.md) - Detail layer system
- [05. Auth State Management](../02-authentication/05-auth-state.md) - Authentication
- [15. Message Flow](../04-messages/15-message-flow.md) - How messages work
