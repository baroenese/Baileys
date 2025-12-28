/**
 * Phase 1 Features Test Suite
 * 
 * Run with: pnpm test
 * 
 * Tests all core message features:
 * - Media handling
 * - Reactions
 * - Quotes/replies
 * - Polls
 * - Message modification
 */

import { ExtendedBaileysManager } from '../lib/baileys/extended-baileys-manager'
import { EventPublisher } from '../lib/utils/event-publisher'
import type { WAMessage } from '@whiskeysockets/baileys'

// Test configuration
const TEST_SESSION_ID = 'test-phase1'
const TEST_JID = process.env.TEST_JID || '1234567890@s.whatsapp.net'
const ENABLE_LIVE_TESTS = process.env.ENABLE_LIVE_TESTS === 'true'

describe('Phase 1 - Core Message Features', () => {
  let manager: ExtendedBaileysManager
  let lastMessage: WAMessage | undefined
  const eventPublisher = new EventPublisher()

  beforeAll(async () => {
    if (!ENABLE_LIVE_TESTS) {
      console.log('⚠️ Live tests disabled. Set ENABLE_LIVE_TESTS=true to enable.')
      return
    }

    manager = new ExtendedBaileysManager(TEST_SESSION_ID, eventPublisher)
    
    // Wait for connection
    const connected = new Promise<void>((resolve) => {
      manager.once('connected', () => {
        console.log('✅ Connected to WhatsApp')
        resolve()
      })
    })

    await manager.start()
    await connected

    // Wait a bit for initialization
    await delay(2000)
  }, 60000) // 60s timeout for connection

  afterAll(async () => {
    if (manager) {
      await manager.disconnect()
      await manager.cleanup()
    }
  })

  describe('Feature Availability', () => {
    test('should have all handlers initialized', () => {
      if (!ENABLE_LIVE_TESTS) return
      
      const status = manager.getFeatureStatus()
      
      expect(status.connected).toBe(true)
      expect(status.features.media).toBe(true)
      expect(status.features.reactions).toBe(true)
      expect(status.features.quotes).toBe(true)
      expect(status.features.polls).toBe(true)
      expect(status.features.modifier).toBe(true)
    })

    test('should have quick access methods', () => {
      if (!ENABLE_LIVE_TESTS) return
      
      expect(typeof manager.sendImage).toBe('function')
      expect(typeof manager.sendVideo).toBe('function')
      expect(typeof manager.sendVoiceNote).toBe('function')
      expect(typeof manager.reactToMessage).toBe('function')
      expect(typeof manager.replyToMessage).toBe('function')
      expect(typeof manager.createPoll).toBe('function')
    })
  })

  describe('MediaHandler', () => {
    test('should send text message (baseline)', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      lastMessage = await manager.sendMessage(TEST_JID, 'Test message from Phase 1 suite')
      
      expect(lastMessage).toBeDefined()
      expect(lastMessage?.key).toBeDefined()
    }, 10000)

    test('should send image message', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      // Create a tiny 1x1 red pixel PNG
      const redPixel = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
        0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      
      const msg = await manager.sendImage(TEST_JID, redPixel, 'Test image')
      
      expect(msg).toBeDefined()
      expect(msg?.message?.imageMessage).toBeDefined()
    }, 10000)

    test('should detect media in messages', () => {
      const mockMsg = {
        key: { id: '123' },
        message: { imageMessage: { url: 'test' } }
      } as any
      
      expect(manager.media.hasMedia(mockMsg)).toBe(true)
      expect(manager.media.getMediaType(mockMsg)).toBe('image')
    })
  })

  describe('ReactionHandler', () => {
    test('should send reaction', async () => {
      if (!ENABLE_LIVE_TESTS || !lastMessage) return
      
      const reaction = await manager.reactToMessage(TEST_JID, lastMessage.key, '👍')
      
      expect(reaction).toBeDefined()
    }, 10000)

    test('should validate emoji', () => {
      expect(manager.reactions.isValidEmoji('👍')).toBe(true)
      expect(manager.reactions.isValidEmoji('❤️')).toBe(true)
      expect(manager.reactions.isValidEmoji('abc')).toBe(false)
    })

    test('should remove reaction', async () => {
      if (!ENABLE_LIVE_TESTS || !lastMessage) return
      
      const result = await manager.reactions.removeReaction(TEST_JID, lastMessage.key)
      
      expect(result).toBeDefined()
    }, 10000)
  })

  describe('QuoteHandler', () => {
    test('should reply to message', async () => {
      if (!ENABLE_LIVE_TESTS || !lastMessage) return
      
      const reply = await manager.replyToMessage(
        TEST_JID,
        'This is a reply',
        lastMessage
      )
      
      expect(reply).toBeDefined()
      expect(reply?.message?.extendedTextMessage?.contextInfo?.stanzaId).toBe(lastMessage.key.id)
    }, 10000)

    test('should detect reply messages', () => {
      const replyMsg = {
        message: {
          extendedTextMessage: {
            contextInfo: {
              stanzaId: '123',
              quotedMessage: { conversation: 'original' }
            }
          }
        }
      } as any
      
      expect(manager.quotes.isReply(replyMsg)).toBe(true)
      expect(manager.quotes.getQuotedMessageId(replyMsg)).toBe('123')
    })
  })

  describe('PollHandler', () => {
    test('should create single-choice poll', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      const poll = await manager.createPoll(
        TEST_JID,
        'Test poll?',
        ['Option 1', 'Option 2', 'Option 3']
      )
      
      expect(poll).toBeDefined()
      expect(poll?.message?.pollCreationMessage).toBeDefined()
      
      lastMessage = poll
    }, 10000)

    test('should validate poll options', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      // Too few options
      await expect(
        manager.polls.createPoll(TEST_JID, 'Bad poll', ['Only one'])
      ).rejects.toThrow('at least 2 options')
      
      // Too many options
      const tooMany = Array.from({ length: 13 }, (_, i) => `Option ${i}`)
      await expect(
        manager.polls.createPoll(TEST_JID, 'Bad poll', tooMany)
      ).rejects.toThrow('more than 12 options')
    })

    test('should detect poll messages', () => {
      const pollMsg = {
        message: {
          pollCreationMessage: {
            name: 'Test',
            options: [{ optionName: 'A' }, { optionName: 'B' }]
          }
        }
      } as any
      
      expect(manager.polls.isPollMessage(pollMsg)).toBe(true)
      
      const info = manager.polls.getPollInfo(pollMsg)
      expect(info?.name).toBe('Test')
      expect(info?.options).toHaveLength(2)
    })
  })

  describe('MessageModifierHandler', () => {
    test('should edit message', async () => {
      if (!ENABLE_LIVE_TESTS || !lastMessage) return
      
      const edited = await manager.editMessage(
        TEST_JID,
        lastMessage.key,
        'Edited text'
      )
      
      expect(edited).toBeDefined()
    }, 10000)

    test('should mark message as read', async () => {
      if (!ENABLE_LIVE_TESTS || !lastMessage) return
      
      await expect(
        manager.modifier.markMessageAsRead(TEST_JID, lastMessage.key)
      ).resolves.not.toThrow()
    }, 10000)

    test('should pin chat', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      await expect(
        manager.modifier.pinChat(TEST_JID, true)
      ).resolves.not.toThrow()
      
      // Unpin
      await manager.modifier.pinChat(TEST_JID, false)
    }, 10000)

    test('should archive chat', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      await expect(
        manager.modifier.archiveChat(TEST_JID, true)
      ).resolves.not.toThrow()
      
      // Unarchive
      await manager.modifier.archiveChat(TEST_JID, false)
    }, 10000)
  })

  describe('Integration Tests', () => {
    test('should handle complete message flow', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      // 1. Send message
      const msg = await manager.sendMessage(TEST_JID, 'Integration test')
      expect(msg).toBeDefined()
      
      // 2. React to it
      if (msg) {
        await manager.reactToMessage(TEST_JID, msg.key, '✅')
      }
      
      // 3. Reply to it
      if (msg) {
        const reply = await manager.replyToMessage(TEST_JID, 'Reply test', msg)
        expect(reply).toBeDefined()
        
        // 4. Edit the reply
        if (reply) {
          await manager.editMessage(TEST_JID, reply.key, 'Edited reply')
        }
      }
      
      // 5. Mark as read
      if (msg) {
        await manager.modifier.markMessageAsRead(TEST_JID, msg.key)
      }
    }, 30000)

    test('should handle errors gracefully', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      // Invalid JID
      await expect(
        manager.sendMessage('invalid-jid', 'test')
      ).rejects.toThrow()
      
      // Invalid emoji
      await expect(
        manager.reactions.sendReaction(TEST_JID, { id: 'fake' }, '')
      ).rejects.toBeDefined()
    })
  })

  describe('Performance', () => {
    test('should send 10 messages quickly', async () => {
      if (!ENABLE_LIVE_TESTS) return
      
      const start = Date.now()
      
      for (let i = 0; i < 10; i++) {
        await manager.sendMessage(TEST_JID, `Perf test ${i}`)
        await delay(100) // Avoid rate limiting
      }
      
      const elapsed = Date.now() - start
      
      // Should complete in reasonable time (< 5s for 10 messages)
      expect(elapsed).toBeLessThan(5000)
    }, 20000)
  })
})

// Helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
