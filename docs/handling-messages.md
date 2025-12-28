# Handling Messages

Baileys exposes events via `sock.ev`. The most important one for building bots is `messages.upsert`.

## Listening for Messages

```ts
sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return // Ignore 'append' (own messages sync)

    for (const msg of messages) {
        if (!msg.message) continue // Skip internal control messages

        console.log('Received message:', JSON.stringify(msg, null, 2))

        // Basic Text Handling
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (text === '!ping') {
             // Reply logic
        }
    }
})
```

## Message Types

You should check what type of message it is:

-   **Text**: `msg.message.conversation` or `msg.message.extendedTextMessage.text`
-   **Image**: `msg.message.imageMessage`
-   **Video**: `msg.message.videoMessage`
-   **Audio**: `msg.message.audioMessage`

### Utility: `getContentType`

```ts
import { getContentType } from '@whiskeysockets/baileys'

const type = getContentType(msg.message)
if (type === 'imageMessage') {
    // Handle image
}
```

## Sending Messages

### Text Reply

```ts
const jid = msg.key.remoteJid!
await sock.sendMessage(jid, { text: 'Pong!' })
```

### Quoting a Message

Pass the original message object as the `quoted` option.

```ts
await sock.sendMessage(jid, { text: 'I am replying to you!' }, { quoted: msg })
```

### Sending Media

You can send buffers, streams, or URLs.

```ts
await sock.sendMessage(jid, {
    image: { url: 'https://example.com/image.png' },
    caption: 'Here is an image!'
})
```

### Mentions

```ts
await sock.sendMessage(jid, {
    text: 'Hello @1234567890',
    mentions: ['1234567890@s.whatsapp.net']
})
```
