/**
 * Baileys Implementation - Minimal Production Setup
 * 
 * Fokus: Konektivitas stabil dan session management
 */
import 'dotenv/config'
import { BaileysManager } from './lib/baileys/baileys-manager'
import { ExtendedBaileysManager } from './lib/baileys/extended-baileys-manager'
import { logger } from './lib/utils/logger'
import { config } from './lib/config/config'
import { EventPublisher } from './lib/utils/event-publisher'
import readline from 'readline'

let manager: ExtendedBaileysManager | null = null
const eventPublisher = new EventPublisher()

/**
 * Main entry point
 */
async function main() {
  try {
    // Get session ID from user or use default
    const sessionId = process.argv[2] || await promptSessionId()

    logger.info({ config: { 
      authFolder: config.authFolder,
      logLevel: config.logLevel,
      maxReconnectAttempts: config.maxReconnectAttempts
    }}, 'Starting Baileys implementation')
    
    // Create and start manager
    manager = new ExtendedBaileysManager(sessionId, eventPublisher)
    
    // Setup event listeners
    setupEventListeners(manager)
    
    // Start connection
    await manager.start()
    
    // Keep process alive and show menu
    await interactiveMenu(manager)
    
  } catch (error) {
    logger.error({ err: error }, 'Failed to start')
    process.exit(1)
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(manager: ExtendedBaileysManager) {
  manager.on('qr', (qr: string) => {
    logger.info('QR Code received - scan with WhatsApp')
    console.log('\n' + qr + '\n')
  })

  manager.on('connected', () => {
    logger.info('✅ Connected to WhatsApp')
    console.log('\n✅ Connected! Type "help" for commands\n')
  })

  manager.on('disconnected', (data: any) => {
    logger.warn({ data }, '❌ Disconnected from WhatsApp')
  })

  manager.on('message', (data: any) => {
    const msg = data.message
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
    
    if (text && !msg.key.fromMe) {
      logger.info({ 
        from: msg.key.remoteJid, 
        text: text.substring(0, 50) 
      }, 'Message received')
    }
  })

  manager.on('message.update', (data: any) => {
    logger.debug({ update: data.update }, 'Message updated')
  })
}

/**
 * Interactive menu
 */
async function interactiveMenu(manager: ExtendedBaileysManager) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  console.log('\n📱 Baileys Bot Running')
  console.log('Commands: status | send | metrics | help | exit\n')

  while (true) {
    const cmd = await question('> ')
    const [action, ...args] = cmd.trim().split(' ')

    try {
      switch (action) {
        case 'status':
          const status = manager.getStatus()
          console.log(JSON.stringify(status, null, 2))
          break

        case 'send':
          if (args.length < 2) {
            console.log('Usage: send <jid> <message>')
            break
          }
          const [jid, ...msgParts] = args
          const text = msgParts.join(' ')
          await manager.sendMessage(jid, text)
          console.log('✅ Message sent')
          break

        case 'metrics':
          const metrics = manager.getMetrics()
          console.log(JSON.stringify(metrics, null, 2))
          break

        case 'group-info':
          if (args.length < 1) {
            console.log('Usage: group-info <jid>')
            break
          }
          const groupJid = args[0]
          const metadata = await manager.getGroupMetadata(groupJid)
          console.log(JSON.stringify(metadata, null, 2))
          break

        case 'send-poll':
          if (args.length < 3) {
            console.log('Usage: send-poll <jid> <question> <option1,option2,...>')
            break
          }
          const [pollJid, pollQuestion, pollOptions] = args
          const options = pollOptions.split(',')
          await manager.polls.createPoll(pollJid, pollQuestion, options)
          console.log('✅ Poll sent')
          break

        case 'reconnect':
          console.log('🔄 Reconnecting...')
          await manager.disconnect()
          await manager.start()
          console.log('✅ Reconnection initiated')
          break

        case 'help':
          console.log(`
Available commands:
  status          - Show connection status
  send <jid> <msg> - Send message (e.g., send 6281234567890@s.whatsapp.net Hello)
  send-poll <jid> <question> <opt1,opt2> - Send a poll
  group-info <jid> - Get group metadata
  reconnect       - Force reconnection
  metrics         - Show performance metrics
  help            - Show this help
  exit            - Shutdown gracefully
          `)
          break

        case 'exit':
          console.log('Shutting down...')
          rl.close()
          return

        default:
          if (action) {
            console.log('Unknown command. Type "help" for available commands.')
          }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
    }
  }
}

/**
 * Prompt for session ID
 */
async function promptSessionId(): Promise<string> {
  if (!process.stdin.isTTY) {
    return 'default'
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question('Enter session ID (or press Enter for "default"): ', (answer) => {
      rl.close()
      resolve(answer.trim() || 'default')
    })
  })
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received')
  
  if (manager) {
    try {
      await manager.disconnect()
      await manager.cleanup()
      logger.info('Cleanup complete')
    } catch (error) {
      logger.error({ err: error }, 'Error during cleanup')
    }
  }
  
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start
main().catch(error => {
  logger.error({ err: error }, 'Fatal error')
  process.exit(1)
})
