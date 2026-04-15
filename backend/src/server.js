import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { redis, subscribeRealtime } from './db/redis.js'

// Routes
import authRoutes from './routes/auth.js'
import numberRoutes from './routes/numbers.js'
import groupRoutes from './routes/groups.js'
import analyticsRoutes from './routes/analytics.js'
import contactRoutes from './routes/contacts.js'
import adminRoutes from './routes/admin.js'
import { webhookRoutes, broadcastRoutes } from './routes/webhookAndBroadcasts.js'

// WebSocket manager
export const wsClients = new Map() // tenantId → Set<ws>

const app = Fastify({ logger: true, trustProxy: true })

// ─── Plugins ─────────────────────────────────────────────────

await app.register(cors, {
  origin: (process.env.CORS_ORIGINS || process.env.APP_URL || '*')
    .split(',')
    .map(s => s.trim()),
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  redis,
  keyGenerator: (req) => req.headers['x-tenant-id'] || req.ip,
})

await app.register(websocket)

// ─── Health check ─────────────────────────────────────────────

app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

// ─── Rotas ────────────────────────────────────────────────────

await app.register(authRoutes)
await app.register(numberRoutes)
await app.register(groupRoutes)
await app.register(analyticsRoutes)
await app.register(contactRoutes)
await app.register(broadcastRoutes)
await app.register(webhookRoutes)
await app.register(adminRoutes,     { prefix: '/admin' })

// ─── WebSocket realtime ───────────────────────────────────────

app.register(async (fastify) => {
  fastify.get('/realtime', { websocket: true }, (socket, req) => {
    const tenantId = req.query.tenantId
    if (!tenantId) return socket.close()

    if (!wsClients.has(tenantId)) wsClients.set(tenantId, new Set())
    wsClients.get(tenantId).add(socket)

    socket.on('close', () => {
      wsClients.get(tenantId)?.delete(socket)
    })

    socket.send(JSON.stringify({ type: 'connected', ts: Date.now() }))
  })
})

// ─── Broadcast WebSocket helper ───────────────────────────────

export function emitToTenant(tenantId, event) {
  const clients = wsClients.get(tenantId)
  if (!clients) return
  const payload = JSON.stringify(event)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload)
  }
}

// ─── Start ────────────────────────────────────────────────────

try {
  await app.listen({ port: 3001, host: '0.0.0.0' })
  console.log('🚀 GrupoSpy API rodando na porta 3001')

  // Bridge Redis pub/sub realtime events to WebSocket clients
  await subscribeRealtime((tenantId, event) => {
    emitToTenant(tenantId, event)
  })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
