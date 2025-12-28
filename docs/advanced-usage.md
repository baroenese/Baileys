# Advanced Usage

## Groups

Baileys provides a full API for group management.

### Fetching Metadata
```ts
// Get all metadata (participants, subject, description)
const metadata = await sock.groupMetadata(groupId)
console.log(metadata.participants)
```

### Creating a Group
```ts
const group = await sock.groupCreate('My Cool Group', [participantJid1, participantJid2])
console.log('Created group with id:', group.id)
```

### Modifying Participants
```ts
await sock.groupParticipantsUpdate(
    groupId,
    [participantJid],
    'add' // or 'remove', 'promote', 'demote'
)
```

## Optimizing Performance

### `msgRetryCounterCache`
To handle decryption errors gracefully (waiting for re-tries), use a cache:

```ts
import NodeCache from '@cacheable/node-cache'
const msgRetryCounterCache = new NodeCache()

const sock = makeWASocket({
    // ...
    msgRetryCounterCache
})
```

### Full Store (Recommendation)
Baileys provides an in-memory store, but for bots that need to recall old messages or check contact names efficiently:

```ts
import { makeInMemoryStore } from '@whiskeysockets/baileys'

const store = makeInMemoryStore({ })
store.readFromFile('./baileys_store.json')
// Bind to socket events
store.bind(sock.ev)

// Save periodically
setInterval(() => {
    store.writeToFile('./baileys_store.json')
}, 10_000)
```

## Debugging

Enable trace logging if you are facing issues:

```ts
import P from 'pino'

const logger = P({ level: 'trace' })
const sock = makeWASocket({ logger })
```
