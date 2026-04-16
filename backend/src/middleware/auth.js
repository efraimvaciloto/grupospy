import sql from '../db/connection.js'

export async function loadTenantPlan(tenantId) {
  const [row] = await sql`
    SELECT t.subscription_status, t.trial_ends_at,
           t.extra_groups_purchased, t.extra_group_price_cents,
           p.max_numbers, p.max_groups, p.features,
           p.price_cents, p.slug AS plan_slug
    FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
    WHERE t.id = ${tenantId}
  `
  return row
}

export function requireFeature(key) {
  return async (req, reply) => {
    const plan = await loadTenantPlan(req.tenantId)
    if (!plan?.features?.[key]) {
      return reply.status(403).send({
        error: 'feature_not_available',
        feature: key,
        message: 'Funcionalidade não disponível no seu plano.',
      })
    }
  }
}

export async function authenticate(req, reply) {
  try {
    await req.jwtVerify()
    const { userId, tenantId } = req.user

    const [user] = await sql`
      SELECT u.id, u.tenant_id, u.role, u.is_active,
             t.subscription_status, t.trial_ends_at, t.is_active AS tenant_active
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = ${userId} AND u.tenant_id = ${tenantId}
    `

    if (!user || !user.isActive || !user.tenantActive) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    // Trial expiry check
    if (user.subscriptionStatus === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt) < new Date()) {
      return reply.status(402).send({ error: 'trial_expired', message: 'Seu período de teste expirou. Ative um plano para continuar.' })
    }

    req.tenantId = tenantId
    req.userId   = userId
    req.userRole = user.role
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid token' })
  }
}

export async function authenticateAdmin(req, reply) {
  try {
    await req.jwtVerify()
    if (req.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    req.adminId = req.user.adminId
  } catch {
    return reply.status(401).send({ error: 'Invalid token' })
  }
}

export function requireRole(...roles) {
  return async (req, reply) => {
    if (!roles.includes(req.userRole)) {
      return reply.status(403).send({ error: 'Insufficient permissions' })
    }
  }
}
