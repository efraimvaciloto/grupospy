import sql from '../db/connection.js'
import { authenticate, loadTenantPlan } from '../middleware/auth.js'

export default async function extraGroupRoutes(fastify) {

  // POST /tenants/extra-groups — purchase additional monitored groups
  fastify.post('/tenants/extra-groups', { onRequest: [authenticate] }, async (req, reply) => {
    const { quantity } = req.body

    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return reply.status(400).send({ error: 'quantity deve ser um inteiro positivo.' })
    }

    const plan = await loadTenantPlan(req.tenantId)

    if (!plan) {
      return reply.status(404).send({ error: 'Plano não encontrado.' })
    }

    if (plan.maxGroups === -1) {
      return reply.status(400).send({ error: 'Plano Business já tem grupos ilimitados.' })
    }

    const pricePerGroup = plan.maxGroups > 0
      ? Math.round((plan.priceCents || 0) / plan.maxGroups)
      : 0

    const totalCents = pricePerGroup * quantity

    // Por ora: aprovar direto (integrar Stripe depois)
    await sql`
      UPDATE tenants
      SET extra_groups_purchased = extra_groups_purchased + ${quantity},
          extra_group_price_cents = ${pricePerGroup},
          updated_at = now()
      WHERE id = ${req.tenantId}
    `

    return {
      success: true,
      extraGroupsBought: quantity,
      pricePerGroupCents: pricePerGroup,
      totalCents,
      message: `${quantity} grupo(s) extra(s) ativados por R$${(totalCents / 100).toFixed(2).replace('.', ',')}/mês.`,
    }
  })
}
