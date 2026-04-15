import bcrypt from 'bcrypt'
import sql from '../db/connection.js'

export default async function adminRoutes(fastify) {

  // Autenticação separada para o admin
  async function adminAuth(req, reply) {
    try {
      await req.jwtVerify()
      if (!req.user.isAdmin) return reply.status(403).send({ error: 'Forbidden' })
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  }

  // POST /admin/auth/login
  fastify.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body
    const [admin] = await sql`SELECT * FROM admin_users WHERE email = ${email}`
    if (!admin) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = fastify.jwt.sign(
      { adminId: admin.id, isAdmin: true },
      { expiresIn: '8h' }
    )
    return { access_token: token }
  })

  // ─── Métricas SaaS ───────────────────────────────────────────

  // GET /admin/metrics
  fastify.get('/metrics', { onRequest: adminAuth }, async () => {
    const [saas] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE subscription_status = 'active')  AS active_tenants,
        COUNT(*) FILTER (WHERE subscription_status = 'trial')   AS trial_tenants,
        COUNT(*) FILTER (WHERE subscription_status = 'canceled') AS canceled_tenants,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS new_this_month
      FROM tenants WHERE is_active = true
    `

    const mrr = await sql`
      SELECT COALESCE(SUM(p.price_cents), 0) AS mrr_cents
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.subscription_status = 'active'
    `

    const churn = await sql`
      SELECT COUNT(*) AS churned
      FROM tenants
      WHERE subscription_status = 'canceled'
        AND updated_at >= DATE_TRUNC('month', NOW())
    `

    const waNumbers = await sql`SELECT COUNT(*) FROM wa_numbers WHERE status = 'connected'`
    const aiCosts   = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) AS total_cost_usd
      FROM ai_usage_log
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `

    return {
      tenants: {
        active:       parseInt(saas.activeTenants),
        trial:        parseInt(saas.trialTenants),
        canceled:     parseInt(saas.canceledTenants),
        newThisMonth: parseInt(saas.newThisMonth),
      },
      mrr: {
        cents: parseInt(mrr[0].mrrCents),
        brl:   (parseInt(mrr[0].mrrCents) / 100).toFixed(2),
      },
      churnThisMonth:      parseInt(churn[0].churned),
      connectedNumbers:    parseInt(waNumbers[0].count),
      aiCostUsdThisMonth:  parseFloat(aiCosts[0].totalCostUsd).toFixed(4),
    }
  })

  // ─── Tenants ─────────────────────────────────────────────────

  // GET /admin/tenants
  fastify.get('/tenants', { onRequest: adminAuth }, async (req) => {
    const { page = 1, limit = 20, search, status } = req.query
    const offset = (page - 1) * limit

    const rows = await sql`
      SELECT t.*, p.name AS plan_name, p.price_cents,
             (SELECT COUNT(*) FROM wa_numbers w WHERE w.tenant_id = t.id) AS numbers_count,
             (SELECT COUNT(*) FROM groups g WHERE g.tenant_id = t.id) AS groups_count
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE true
        ${search ? sql`AND (t.name ILIKE ${'%' + search + '%'} OR t.email ILIKE ${'%' + search + '%'})` : sql``}
        ${status ? sql`AND t.subscription_status = ${status}` : sql``}
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const [{ count }] = await sql`SELECT COUNT(*) FROM tenants`
    return { data: rows, meta: { total: parseInt(count) } }
  })

  // GET /admin/tenants/:id
  fastify.get('/tenants/:id', { onRequest: adminAuth }, async (req, reply) => {
    const [tenant] = await sql`
      SELECT t.*, p.name AS plan_name, p.price_cents, p.max_numbers, p.max_groups
      FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.id = ${req.params.id}
    `
    if (!tenant) return reply.status(404).send({ error: 'Not found' })

    const numbers = await sql`SELECT * FROM wa_numbers WHERE tenant_id = ${tenant.id}`
    const aiCost  = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) AS total FROM ai_usage_log WHERE tenant_id = ${tenant.id}
    `

    return { ...tenant, numbers, aiCostTotal: parseFloat(aiCost[0].total).toFixed(4) }
  })

  // PATCH /admin/tenants/:id
  fastify.patch('/tenants/:id', { onRequest: adminAuth }, async (req, reply) => {
    const { planId, subscriptionStatus, isActive } = req.body
    const [tenant] = await sql`
      UPDATE tenants SET
        plan_id             = COALESCE(${planId || null}::uuid, plan_id),
        subscription_status = COALESCE(${subscriptionStatus || null}, subscription_status),
        is_active           = COALESCE(${isActive ?? null}, is_active),
        updated_at          = now()
      WHERE id = ${req.params.id}
      RETURNING *
    `
    if (!tenant) return reply.status(404).send({ error: 'Not found' })
    return tenant
  })

  // POST /admin/tenants/:id/impersonate — gerar token como o tenant
  fastify.post('/tenants/:id/impersonate', { onRequest: adminAuth }, async (req, reply) => {
    const [owner] = await sql`
      SELECT id, tenant_id, role FROM users
      WHERE tenant_id = ${req.params.id} AND role = 'owner'
      LIMIT 1
    `
    if (!owner) return reply.status(404).send({ error: 'Owner not found' })

    const token = fastify.jwt.sign(
      { userId: owner.id, tenantId: owner.tenantId, role: owner.role, impersonated: true },
      { expiresIn: '2h' }
    )
    return { access_token: token, notice: 'Impersonation token — válido por 2h' }
  })

  // ─── Planos ──────────────────────────────────────────────────

  // GET /admin/plans
  fastify.get('/plans', { onRequest: adminAuth }, async () => {
    return sql`SELECT * FROM plans ORDER BY price_cents ASC`
  })

  // POST /admin/plans
  fastify.post('/plans', { onRequest: adminAuth }, async (req, reply) => {
    const { name, slug, priceCents, maxNumbers, maxGroups, features } = req.body
    const [plan] = await sql`
      INSERT INTO plans (name, slug, price_cents, max_numbers, max_groups, features)
      VALUES (${name}, ${slug}, ${priceCents}, ${maxNumbers}, ${maxGroups || -1}, ${JSON.stringify(features || {})})
      RETURNING *
    `
    return reply.status(201).send(plan)
  })

  // PATCH /admin/plans/:id
  fastify.patch('/plans/:id', { onRequest: adminAuth }, async (req, reply) => {
    const { name, priceCents, maxNumbers, maxGroups, features, isActive } = req.body
    const [plan] = await sql`
      UPDATE plans SET
        name        = COALESCE(${name || null}, name),
        price_cents = COALESCE(${priceCents || null}, price_cents),
        max_numbers = COALESCE(${maxNumbers || null}, max_numbers),
        max_groups  = COALESCE(${maxGroups || null}, max_groups),
        features    = COALESCE(${features ? JSON.stringify(features) : null}::jsonb, features),
        is_active   = COALESCE(${isActive ?? null}, is_active),
        updated_at  = now()
      WHERE id = ${req.params.id}
      RETURNING *
    `
    if (!plan) return reply.status(404).send({ error: 'Not found' })
    return plan
  })

  // ─── Custos IA ───────────────────────────────────────────────

  // GET /admin/ai-costs
  fastify.get('/ai-costs', { onRequest: adminAuth }, async (req) => {
    const { month } = req.query // formato: 2025-01
    const filter = month ? sql`AND TO_CHAR(created_at, 'YYYY-MM') = ${month}` : sql``

    return sql`
      SELECT
        t.name AS tenant_name, t.email,
        SUM(l.tokens_in)  AS total_tokens_in,
        SUM(l.tokens_out) AS total_tokens_out,
        SUM(l.cost_usd)   AS total_cost_usd,
        COUNT(l.id)       AS operations
      FROM ai_usage_log l
      JOIN tenants t ON t.id = l.tenant_id
      WHERE true ${filter}
      GROUP BY t.id, t.name, t.email
      ORDER BY total_cost_usd DESC
    `
  })
}
