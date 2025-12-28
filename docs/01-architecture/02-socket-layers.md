# 02. Socket Layer Architecture

> **Tujuan**: Memahami bagaimana 7 socket layers bekerja dan saling berkomunikasi.

## 🧅 Layered Architecture (Onion Model)

```
                    makeWASocket() ← Your entry point
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 7: makeCommunitiesSocket()                            │
│ └─ Methods: community operations                            │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Layer 6: makeNewsletterSocket()                     │ │
│    │ └─ Methods: newsletter/channel operations           │ │
│    │    ┌─────────────────────────────────────────────┐ │ │
│    │    │ Layer 5: makeBusinessSocket()               │ │ │
│    │    │ └─ Methods: business profile, catalog       │ │ │
│    │    │    ┌─────────────────────────────────────┐ │ │ │
│    │    │    │ Layer 4: makeChatsSocket()          │ │ │ │
│    │    │    │ └─ Methods: chat CRUD, archive      │ │ │ │
│    │    │    │    ┌─────────────────────────────┐ │ │ │ │
│    │    │    │    │ Layer 3: makeGroupsSocket() │ │ │ │ │
│    │    │    │    │ └─ Methods: group mgmt      │ │ │ │ │
│    │    │    │    │    ┌─────────────────────┐ │ │ │ │ │
│    │    │    │    │    │ Layer 2: Messages   │ │ │ │ │ │
│    │    │    │    │    │ └─ Send & encrypt   │ │ │ │ │ │
│    │    │    │    │    │    ┌─────────────┐ │ │ │ │ │ │
│    │    │    │    │    │    │ Layer 1:    │ │ │ │ │ │ │
│    │    │    │    │    │    │ Receive msg │ │ │ │ │ │ │
│    │    │    │    │    │    │    ┌────┐  │ │ │ │ │ │ │
│    │    │    │    │    │    │    │L0  │  │ │ │ │ │ │ │
│    │    │    │    │    │    │    │Base│  │ │ │ │ │ │ │
│    │    │    │    │    │    │    └────┘  │ │ │ │ │ │ │
```

## 📍 Layer 0: Base Socket (makeSocket)

**File**: `src/Socket/socket.ts`

**Responsibilities**:
```typescript
- WebSocket connection & lifecycle
- Noise Protocol (encryption layer)
- Authentication (QR/Pairing code)
- Keep-alive mechanism
- Binary node query system
- Event emitter
```

**Key Methods**:
```typescript
{
  query: (node) => Promise<BinaryNode>      // Send and wait
  sendNode: (node) => Promise<void>         // Fire and forget
  sendRawMessage: (data) => Promise<void>   // Low-level send
  waitForMessage: (id) => Promise<any>      // Wait for response
  uploadPreKeys: () => Promise<void>        // Manage encryption keys
  end: (error?) => void                     // Close connection
}
```

## 📍 Layer 1: Messages Receive Socket

**File**: `src/Socket/messages-recv.ts`

**Responsibilities**:
```typescript
- Receive incoming messages
- Decrypt message content
- Handle message receipts
- Process reactions
- Handle edits & deletes
```

**Extends Layer 0 with**:
```typescript
{
  // All Layer 0 methods +
  processMessage: (msg) => void
  sendReceipt: (jid, id) => void
  sendReadReceipt: (jid, keys) => void
}
```

## 📍 Layer 2: Messages Send Socket

**File**: `src/Socket/messages-send.ts`

**Responsibilities**:
```typescript
- Send messages (text, media, reactions)
- Encrypt outgoing messages
- Handle retries
- Manage device lists
- Media uploads
```

**Extends Layer 1 with**:
```typescript
{
  // All previous layers +
  sendMessage: (jid, content) => Promise<WAMessage>
  relayMessage: (jid, message, options) => Promise<void>
  sendPresenceUpdate: (type, jid) => void
}
```

## 🔄 How Layers Communicate

```typescript
// Example: Sending a message

User Code:
  await sock.sendMessage(jid, { text: 'Hello' })
           ↓
Layer 2 (messages-send.ts):
  - Validates content
  - Calls encryptMessage() → Layer 0's signalRepository
           ↓
Layer 0 (socket.ts):
  - Encrypts with Signal protocol
  - Wraps in binary node
  - Sends via WebSocket
           ↓
WhatsApp Server
```

## 💡 Why This Architecture?

### 1. **Separation of Concerns**
Setiap layer fokus pada satu tanggung jawab.

### 2. **Progressive Enhancement**
Layer atas bisa menggunakan semua method layer bawah.

### 3. **Easy Testing**
Test setiap layer secara independen.

### 4. **Maintainability**
Bug di satu layer tidak affect layer lain.

## 📊 Method Availability

```
Layer 7: ALL methods (from all layers)
Layer 6: Methods from Layer 0-6
Layer 5: Methods from Layer 0-5
...
Layer 0: Base methods only
```

## 🎯 Praktik Terbaik

1. **Gunakan Top Layer**: Always use `makeWASocket()` (Layer 7)
2. **Jangan Skip Layer**: Jangan akses Layer 0 directly
3. **Understand Dependencies**: Method X butuh Y dari layer bawah

## 🔄 Next Steps

- [03. Decorator Pattern](./03-decorator-pattern.md) - Implementation details
- [15. Message Flow](../04-messages/15-message-flow.md) - Message journey
