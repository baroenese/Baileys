# Baileys Pure Worker Architecture (Locked State)

> **Status**: Stable / Locked
> **Date**: December 29, 2025
> **Type**: Event-Driven Microservice

## 🏗️ Core Concept
Aplikasi ini telah di-refactor menjadi **"Pure Worker"**. Aplikasi ini tidak lagi berjalan sebagai CLI tunggal, melainkan sebagai **Consumer** yang mendengarkan perintah dari Redis.

## 📂 Directory Structure (Do Not Change)
Struktur ini sekarang bersifat permanen untuk mendukung skalabilitas.

```
src/
├── worker.ts           # [ENTRY POINT] Main Worker (BullMQ Consumer)
├── index.ts            # [LEGACY] CLI Manual (untuk debugging)
├── test-producer.ts    # [TOOL] Script untuk test kirim job
└── lib/                # [CORE] Logika inti (Library)
    ├── baileys/        # Manager & Orchestrator
    ├── config/         # Konfigurasi terpusat
    ├── features/       # Handler pesan (Media, Poll, dll)
    └── utils/          # Logger, Redis Driver, Auth
```

## 🔌 Interface: Redis Queue
Worker mendengarkan antrian **`whatsapp-jobs`**.

### Supported Jobs
| Job Name | Payload | Description |
|----------|---------|-------------|
| `START_SESSION` | `{ sessionId: string }` | Menyalakan sesi WA (scan QR/connect) |
| `STOP_SESSION` | `{ sessionId: string }` | Mematikan sesi & cleanup memori |
| `SEND_MESSAGE` | `{ sessionId, jid, content }` | Mengirim pesan (Text, Image, dll) |

## 🚀 How to Run
1. **Production (Worker)**: `pnpm worker`
2. **Testing (Producer)**: `pnpm tsx src/test-producer.ts`
3. **Manual Debug**: `pnpm dev`
