# Getting Started

## Installation

Since you are running this from the repository source (recommended for development), you can use the library directly.

If you were using it in a new project:

```bash
yarn add @whiskeysockets/baileys
```

## Basic Connection

Here is the minimal code required to connect to WhatsApp.

```ts
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function connectToWhatsApp() {
    // 1. Load Authentication State
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    // 2. Create the Socket
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Set to false if using Pairing Code
    })

    // 3. Handle Credential Updates
    sock.ev.on('creds.update', saveCreds)

    // 4. Handle Connection Updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed. Reconnecting:', shouldReconnect)
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('Opened connection')
        }
    })
}

connectToWhatsApp()
```
