import 'dotenv/config'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { config } from '../lib/config/config'
import { logger } from '../lib/utils/logger'

/**
 * TEST PRODUCER
 * Script ini mensimulasikan Backend (Laravel/Express) yang mengirim perintah ke Worker.
 */

// Setup connection
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null
})

// Initialize Queue
const whatsappQueue = new Queue('whatsapp-jobs', { connection })

async function main() {
  const sessionId = 'session-test-01'
  
  console.log('\n🚀 TEST PRODUCER STARTED')
  console.log('========================')

  // 1. Start Session
  logger.info(`[1/3] Sending START_SESSION for ${sessionId}...`)
  await whatsappQueue.add('START_SESSION', { 
    sessionId 
  })
  
  console.log('\n✅ Job "START_SESSION" sent to Redis!')
  console.log('👉 Sekarang cek terminal tempat "pnpm worker" berjalan.')
  console.log('👉 Worker seharusnya menerima job ini dan memulai Baileys.\n')
  
  // Optional: Uncomment to test sending message after delay
  /*
  console.log('⏳ Waiting 20s for session to be ready...')
  await new Promise(resolve => setTimeout(resolve, 20000))

  const targetJid = '628xxxxxxxxxx@s.whatsapp.net' // Ganti nomor
  logger.info(`[2/3] Sending SEND_MESSAGE to ${targetJid}...`)
  await whatsappQueue.add('SEND_MESSAGE', {
    sessionId,
    jid: targetJid,
    content: { text: 'Hello from Baileys Worker! 🤖' }
  })
  */

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
