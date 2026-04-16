import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { redis, subscribeRealtime } from './db/redis.js'
import sql from './db/connection.js'

// Routes
import authRoutes from './routes/auth.js'
import numberRoutes from './routes/numbers.js'
import groupRoutes from './routes/groups.js'
import analyticsRoutes from './routes/analytics.js'
import contactRoutes from './routes/contacts.js'
import adminRoutes from './routes/admin.js'
import { webhookRoutes, broadcastRoutes } from './routes/webhookAndBroadcasts.js'
import extraGroupRoutes from './routes/extraGroups.js'

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
await app.register(extraGroupRoutes)
await app.register(webhookRoutes)
await app.register(adminRoutes,     { prefix: '/admin' })

// ─── WebSocket realtime ───────────────────────────────────────

app.register(async (fastify) => {
  fastify.get('/realtime', { websocket: true }, async (socket, req) => {
    // Autenticar via JWT no query param
    const jwtToken = req.query.token
    if (!jwtToken) return socket.close(1008, 'Unauthorized')

    let tenantId
    try {
      const decoded = fastify.jwt.verify(jwtToken)
      tenantId = decoded.tenantId
    } catch {
      return socket.close(1008, 'Invalid token')
    }

    if (!wsClients.has(tenantId)) wsClients.set(tenantId, new Set())
    wsClients.get(tenantId).add(socket)

    // Heartbeat: responder pong quando receber ping do cliente
    socket.on('message', (msg) => {
      if (msg.toString() === 'ping') socket.send('pong')
    })

    // Ping periódico para detectar conexões mortas
    const pingInterval = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'ping' }))
      } else {
        clearInterval(pingInterval)
        wsClients.get(tenantId)?.delete(socket)
      }
    }, 30000)

    socket.on('close', () => {
      clearInterval(pingInterval)
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

// ─── Migrations idempotentes ──────────────────────────────────

async function runMigrations() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ`
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS extra_groups_purchased INTEGER DEFAULT 0`
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS extra_group_price_cents INTEGER DEFAULT 0`
  console.log('✅ Migrations aplicadas')
}

// ─── Start ────────────────────────────────────────────────────

try {
  await runMigrations()
  await app.listen({ port: 3001, host: '0.0.0.0' })
  console.log('🚀 Grupo do Zap API rodando na porta 3001')

  // Bridge Redis pub/sub realtime events to WebSocket clients
  await subscribeRealtime((tenantId, event) => {
    emitToTenant(tenantId, event)
  })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
