# WhatsApp Worker Integration Contract

Dokumen ini mendefinisikan **Kontrak Data (JSON Structure)** untuk komunikasi antara **Producer** (Hono API/Dashboard) dan **Consumer** (WhatsApp Worker).

## 📡 Queue Configuration

*   **Redis Key**: `bull:whatsapp-jobs:...`
*   **Queue Name**: `whatsapp-jobs`
*   **Job Options**:
    *   `attempts`: 3 (Recommended)
    *   `backoff`: `{ type: 'exponential', delay: 1000 }`
    *   `removeOnComplete`: true
    *   `removeOnFail`: false (untuk debugging)

---

## 🛠️ Job Types & Payloads

Setiap job harus memiliki `name` yang spesifik dan `data` sesuai skema di bawah ini.

### 1. Session Management

#### `START_SESSION`
Memulai sesi WhatsApp (koneksi socket). Jika sesi belum ada, akan memicu generate QR Code.

```json
{
  "name": "START_SESSION",
  "data": {
    "sessionId": "user-123"
  }
}
```

#### `STOP_SESSION`
Memutus koneksi socket dan membersihkan resource memori. Tidak menghapus data sesi di disk/db.

```json
{
  "name": "STOP_SESSION",
  "data": {
    "sessionId": "user-123"
  }
}
```

#### `DELETE_SESSION`
Logout dan menghapus data sesi permanen (file/db).

```json
{
  "name": "DELETE_SESSION",
  "data": {
    "sessionId": "user-123"
  }
}
```

---

### 2. Messaging Features

Semua job pesan membutuhkan `sessionId` (pengirim) dan `jid` (penerima).

#### `SEND_TEXT`
Mengirim pesan teks biasa.

```json
{
  "name": "SEND_TEXT",
  "data": {
    "sessionId": "user-123",
    "to": "6281234567890@s.whatsapp.net",
    "text": "Halo, ini pesan dari API!",
    "mentions": ["628987654321@s.whatsapp.net"] // Optional
  }
}
```

#### `SEND_MEDIA`
Mengirim gambar, video, audio, atau dokumen.
*Note: `media` bisa berupa URL (string) atau Base64 (string).*

```json
{
  "name": "SEND_MEDIA",
  "data": {
    "sessionId": "user-123",
    "to": "6281234567890@s.whatsapp.net",
    "type": "image", // 'image' | 'video' | 'audio' | 'document' | 'sticker'
    "media": "https://example.com/image.jpg", 
    "caption": "Lihat gambar ini!", // Optional (image/video only)
    "fileName": "invoice.pdf", // Optional (document only)
    "mimetype": "application/pdf", // Optional
    "ptt": false // True jika ingin dikirim sebagai Voice Note (audio only)
  }
}
```

#### `SEND_POLL`
Membuat polling.

```json
{
  "name": "SEND_POLL",
  "data": {
    "sessionId": "user-123",
    "to": "1234567890@g.us", // Biasanya ke grup
    "name": "Kapan kita meeting?",
    "options": ["Senin", "Selasa", "Rabu"],
    "selectableCount": 1 // 0 untuk multiple choice
  }
}
```

#### `SEND_REACTION`
Memberikan reaksi emoji pada pesan.

```json
{
  "name": "SEND_REACTION",
  "data": {
    "sessionId": "user-123",
    "to": "6281234567890@s.whatsapp.net",
    "key": {
      "remoteJid": "6281234567890@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5..." // ID pesan target
    },
    "emoji": "👍" // Kirim string kosong "" untuk menghapus reaksi
  }
}
```

#### `SEND_REPLY` (Quote)
Membalas pesan tertentu.

```json
{
  "name": "SEND_REPLY",
  "data": {
    "sessionId": "user-123",
    "to": "6281234567890@s.whatsapp.net",
    "text": "Saya setuju dengan ini.",
    "quoted": {
      "key": {
        "remoteJid": "6281234567890@s.whatsapp.net",
        "fromMe": false,
        "id": "BAE5..."
      },
      "message": { ... } // Optional: Isi pesan yang di-quote (untuk preview)
    }
  }
}
```

---

### 3. Group Management

#### `GROUP_CREATE`
Membuat grup baru.

```json
{
  "name": "GROUP_CREATE",
  "data": {
    "sessionId": "user-123",
    "subject": "Tim Developer",
    "participants": ["628123456789@s.whatsapp.net", "628987654321@s.whatsapp.net"]
  }
}
```

#### `GROUP_UPDATE_PARTICIPANTS`
Menambah, menghapus, atau mengubah admin grup.

```json
{
  "name": "GROUP_UPDATE_PARTICIPANTS",
  "data": {
    "sessionId": "user-123",
    "jid": "1234567890@g.us",
    "action": "add", // 'add' | 'remove' | 'promote' | 'demote'
    "participants": ["628555555555@s.whatsapp.net"]
  }
}
```

---

## 🔄 Event Webhook Structure (Outbound)

Worker akan mengirimkan data ke Webhook URL yang dikonfigurasi dengan format berikut:

### `MESSAGE_UPSERT`
Event ketika ada pesan masuk.

```json
{
  "event": "messages.upsert",
  "sessionId": "user-123",
  "timestamp": 1703839200,
  "data": {
    "messages": [
      {
        "key": {
          "remoteJid": "6281234567890@s.whatsapp.net",
          "fromMe": false,
          "id": "3EB0..."
        },
        "message": {
          "conversation": "Halo bot!"
        },
        "pushName": "Budi"
      }
    ],
    "type": "notify"
  }
}
```

### `CONNECTION_UPDATE`
Event perubahan status koneksi (QR Code, Connecting, Open, Close).

```json
{
  "event": "connection.update",
  "sessionId": "user-123",
  "timestamp": 1703839205,
  "data": {
    "connection": "open", // 'connecting' | 'open' | 'close'
    "qr": "2@...", // Hanya ada jika connection belum open dan butuh scan
    "lastDisconnect": { ... } // Hanya ada jika connection close
  }
}
```
