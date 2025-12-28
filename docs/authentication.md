# Authentication

Baileys requires proper session management to persist authentication across restarts. We use `useMultiFileAuthState` for a simple file-based solution, but for production, you should implement a database store.

## The Auth Flow

1.  **Initial Connection**: No credentials exist. The library generates keys and requests a QR scan or Pairing Code.
2.  **QR Scan / Pairing**: You scan the code or enter the pairing code on your phone.
3.  **Authentication Success**: The phone validates the keys.
4.  **Session Saving**: The library emits `creds.update`. **You MUST save these changes.**

## Session Management with `useMultiFileAuthState`

This helper function manages storing keys in a directory (JSON files).

```ts
const { state, saveCreds } = await useMultiFileAuthState('path/to/auth_folder')
const sock = makeWASocket({ auth: state })
sock.ev.on('creds.update', saveCreds)
```

> [!WARNING]
> Do NOT delete the auth folder unless you want to force a logout.

## Pairing Code (No QR)

To use a pairing code instead of a QR code:

```ts
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Important: Disable QR
})

if (!sock.authState.creds.registered) {
    // Wait a moment for socket to init? (Usually safe to call immediately after init check)
    try {
        const phoneNumber = '1234567890' // Your phone number with country code
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`Pairing code: ${code}`)
    } catch (err) {
        console.error("Failed to request pairing code", err)
    }
}
```

## Production Best Practices

-   **Database Storage**: Don't use files in production (Docker containers might lose them). Implement a custom `AuthState` using Redis, PostgreSQL, or MongoDB.
-   **Security**: The auth keys give full access to the WhatsApp account. Protect them!
