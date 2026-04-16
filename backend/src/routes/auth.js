import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import sql from '../db/connection.js'
import * as uazapi from '../services/uazapi.js'
import { authenticate } from '../middleware/auth.js'

// Atualiza status de todos os números de um tenant via uazapi
async function refreshNumberStatuses(tenantId) {
  const numbers = await sql`SELECT * FROM wa_numbers WHERE tenant_id = ${tenantId}`
  for (const num of numbers) {
    try {
      const result = await uazapi.getInstanceStatus(num.uazapiToken)
      const inst = result.instance || result
      const connStatus = inst.status || (result.status?.connected ? 'connected' : 'disconnected')
      const phoneNumber = result.status?.jid?.user || inst.phoneNumber || null
      await sql`
        UPDATE wa_numbers SET
          status = ${connStatus || num.status},
          phone_number = COALESCE(${phoneNumber}, phone_number),
          profile_name = COALESCE(${inst.profileName || null}, profile_name),
          profile_pic_url = COALESCE(${inst.profilePicUrl || null}, profile_pic_url),
          is_business = COALESCE(${inst.isBusiness ?? null}, is_business),
          updated_at = now()
        WHERE id = ${num.id}
      `
    } catch {}
  }
}

async function getTenantWithPlan(tenantId) {
  const [row] = await sql`
    SELECT t.*, p.slug AS plan_slug, p.max_numbers, p.max_groups, p.features, p.price_cents
    FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
    WHERE t.id = ${tenantId}
  `
  return row
}

export default async function authRoutes(fastify) {

  // POST /auth/register
  fastify.post('/auth/register', async (req, reply) => {
    const { name, email, password, companyName } = req.body

    if (!name || !email || !password || !companyName) {
      return reply.status(400).send({ error: 'Missing required fields' })
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const hash  = await bcrypt.hash(password, 12)
    const slug  = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50) + '-' + Date.now()

    // Buscar plano starter
    const [plan] = await sql`SELECT * FROM plans WHERE slug = 'starter' LIMIT 1`

    const [tenant] = await sql`
      INSERT INTO tenants (name, slug, email, plan_id, trial_ends_at, subscription_status)
      VALUES (
        ${companyName}, ${slug}, ${email},
        ${plan?.id || null},
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)},
        'trial'
      )
      RETURNING *
    `

    const [user] = await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role)
      VALUES (${tenant.id}, ${name}, ${email}, ${hash}, 'owner')
      RETURNING id, tenant_id, name, email, role
    `

    const token = fastify.jwt.sign(
      { userId: user.id, tenantId: tenant.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    )

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, tenantId: tenant.id, type: 'refresh' },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
    )

    return reply.status(201).send({
      access_token: token,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: plan?.slug || 'starter',
        planSlug: plan?.slug || 'starter',
        subscriptionStatus: 'trial',
        trialEndsAt: tenant.trialEndsAt,
        maxNumbers: plan?.maxNumbers || 1,
        maxGroups: plan?.maxGroups || 10,
        features: plan?.features || {},
        priceCents: plan?.priceCents || 9700,
      },
    })
  })

  // POST /auth/login
  fastify.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body

    const [user] = await sql`
      SELECT u.*, t.id AS tenant_id_val, t.name AS tenant_name,
             t.subscription_status, t.trial_ends_at, t.is_active AS tenant_active,
             t.extra_groups_purchased, t.extra_group_price_cents,
             p.slug AS plan_slug, p.max_numbers, p.max_groups, p.features, p.price_cents
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE u.email = ${email}
    `

    if (!user || !user.isActive || !user.tenantActive) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`

    // Atualizar status dos números em background (não bloqueia o login)
    refreshNumberStatuses(user.tenantId).catch(() => {})

    const token = fastify.jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    )

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, tenantId: user.tenantId, type: 'refresh' },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
    )

    return {
      access_token: token,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: {
        id: user.tenantId,
        name: user.tenantName,
        plan: user.planSlug,
        planSlug: user.planSlug,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        maxNumbers: user.maxNumbers || 1,
        maxGroups: user.maxGroups || 10,
        features: user.features || {},
        priceCents: user.priceCents || 9700,
        extraGroupsPurchased: user.extraGroupsPurchased || 0,
      },
    }
  })

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (req, reply) => {
    const { refresh_token } = req.body
    try {
      const decoded = fastify.jwt.verify(refresh_token)
      if (decoded.type !== 'refresh') throw new Error('Invalid token type')

      const token = fastify.jwt.sign(
        { userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role },
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      )
      return { access_token: token }
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  // GET /auth/me — retorna user + tenant completo + usage
  fastify.get('/auth/me', { onRequest: [authenticate] }, async (req, reply) => {
    const [user] = await sql`
      SELECT u.id, u.name, u.email, u.role, u.avatar_url,
             t.id AS tenant_id, t.name AS tenant_name,
             t.subscription_status, t.trial_ends_at,
             t.extra_groups_purchased, t.extra_group_price_cents,
             p.slug AS plan_slug, p.max_numbers, p.max_groups, p.features, p.price_cents
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE u.id = ${req.userId}
    `
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const [{ count: numbersUsed }] = await sql`
      SELECT COUNT(*) FROM wa_numbers WHERE tenant_id = ${req.tenantId}
    `
    const [{ count: groupsMonitored }] = await sql`
      SELECT COUNT(*) FROM groups WHERE tenant_id = ${req.tenantId} AND is_monitored = true AND is_archived = false
    `

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      tenant: {
        id: user.tenantId,
        name: user.tenantName,
        plan: user.planSlug,
        planSlug: user.planSlug,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        maxNumbers: user.maxNumbers || 1,
        maxGroups: user.maxGroups || 10,
        features: user.features || {},
        priceCents: user.priceCents || 9700,
        extraGroupsPurchased: user.extraGroupsPurchased || 0,
        extraGroupPriceCents: user.extraGroupPriceCents || 0,
      },
      usage: {
        numbersUsed: parseInt(numbersUsed),
        groupsMonitored: parseInt(groupsMonitored),
      },
    }
  })

  // PATCH /auth/me — atualiza planId e onboardingCompleted
  fastify.patch('/auth/me', { onRequest: [authenticate] }, async (req, reply) => {
    const { planId, onboardingCompleted } = req.body

    const updates = []
    if (planId) {
      const [plan] = await sql`SELECT id FROM plans WHERE id = ${planId}`
      if (!plan) return reply.status(400).send({ error: 'Plan not found' })
      await sql`UPDATE tenants SET plan_id = ${planId}, updated_at = now() WHERE id = ${req.tenantId}`
    }
    if (onboardingCompleted) {
      await sql`UPDATE tenants SET onboarding_completed_at = now(), updated_at = now() WHERE id = ${req.tenantId}`
    }

    return { success: true }
  })

  // GET /plans — público (sem auth)
  fastify.get('/plans', async (req, reply) => {
    const result = await sql`
      SELECT id, name, slug, price_cents, max_numbers, max_groups, features
      FROM plans
      WHERE is_active = true
      ORDER BY price_cents ASC
    `
    return result
  })
}
