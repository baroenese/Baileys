import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { config } from './lib/config/config'
import { logger } from './lib/utils/logger'
import { SessionOrchestrator } from './lib/baileys/session-orchestrator'

const orchestrator = new SessionOrchestrator()

// Redis connection for BullMQ
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null
})

const worker = new Worker('whatsapp-jobs', async (job: Job) => {
  logger.info({ jobId: job.id, name: job.name }, 'Processing job')

  try {
    switch (job.name) {
      case 'START_SESSION':
        const { sessionId } = job.data
        await orchestrator.startSession(sessionId)
        return { status: 'started', sessionId }

      case 'STOP_SESSION':
        await orchestrator.stopSession(job.data.sessionId)
        return { status: 'stopped', sessionId: job.data.sessionId }

      case 'SEND_MESSAGE':
        const { sessionId: sid, jid, content, options } = job.data
        const session = orchestrator.getSession(sid)
        if (!session) {
            throw new Error(`Session ${sid} not found`)
        }
        const result = await session.sendMessage(jid, content, options)
        return { status: 'sent', messageId: result?.key?.id }
        
      default:
        throw new Error(`Unknown job name: ${job.name}`)
    }
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Job failed')
    throw error
  }
}, {
  connection
})

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed')
})

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed')
})

logger.info('Worker started, listening for jobs on queue: whatsapp-jobs')

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down worker...`)
  await worker.close()
  await orchestrator.shutdown()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
