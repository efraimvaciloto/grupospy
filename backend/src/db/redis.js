import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = new URL(process.env.REDIS_URL)

export const redis = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Dedicated subscriber connection (Redis requires separate connections for subscribers)
export const redisSub = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const REALTIME_CHANNEL = 'grupospy:realtime'

export async function publishRealtimeEvent(tenantId, event) {
  const payload = JSON.stringify({ tenantId, event })
  await redis.publish(REALTIME_CHANNEL, payload)
}

export async function subscribeRealtime(handler) {
  await redisSub.subscribe(REALTIME_CHANNEL)
  redisSub.on('message', (channel, message) => {
    if (channel !== REALTIME_CHANNEL) return
    try {
      const { tenantId, event } = JSON.parse(message)
      handler(tenantId, event)
    } catch (err) {
      console.error('Failed to parse realtime event:', err)
    }
  })
}

const connection = { connection: redis }

// ─── Filas ────────────────────────────────────────────────────

export const webhookQueue = new Queue('webhook-processor', connection)
export const aiQueue      = new Queue('ai-processor', connection)
export const broadcastQueue = new Queue('broadcast-processor', connection)

// Adicionar jobs
export async function enqueueWebhook(data) {
  return webhookQueue.add('process', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  })
}

export async function enqueueAI(data, opts = {}) {
  return aiQueue.add('process', data, {
    priority: opts.priority || 5,
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  })
}

export async function enqueueBroadcast(data) {
  return broadcastQueue.add('process', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  })
}

export default redis
