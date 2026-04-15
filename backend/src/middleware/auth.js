import sql from '../db/connection.js'

export async function authenticate(req, reply) {
  try {
    await req.jwtVerify()
    const { userId, tenantId } = req.user

    const [user] = await sql`
      SELECT u.id, u.tenant_id, u.role, u.is_active, t.subscription_status, t.is_active AS tenant_active
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = ${userId} AND u.tenant_id = ${tenantId}
    `

    if (!user || !user.isActive || !user.tenantActive) {
      return reply.status(401).send({ error: 'Unauthorized' })
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
