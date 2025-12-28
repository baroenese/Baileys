import 'dotenv/config'
import Redis from 'ioredis'
import { config } from '../lib/config/config'

const redis = new Redis(config.redisUrl)
const sessionId = 'session-test-01'
const channel = `whatsapp:events:${sessionId}`

console.log(`Listening for events on channel: ${channel}`)

redis.subscribe(channel, (err, count) => {
  if (err) {
    console.error('Failed to subscribe: %s', err.message)
  } else {
    console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`)
  }
})

redis.on('message', (channel, message) => {
  console.log(`Received ${message} from ${channel}`)
  const event = JSON.parse(message)
  console.log('Event Type:', event.event)
  console.log('Data:', JSON.stringify(event.data, null, 2))
})
