import sql from '../db/connection.js'
import { authenticate } from '../middleware/auth.js'
import { enqueueWebhook } from '../db/redis.js'
import * as uazapi from '../services/uazapi.js'

// ─── Webhook Routes ───────────────────────────────────────────

export async function webhookRoutes(fastify) {

  // POST /webhook/uazapi/:instanceId/:eventType
  // addUrlEvents=true faz uazapi enviar para /webhook/uazapi/:id/messages etc.
  fastify.post('/webhook/uazapi/:instanceId/:eventType', async (req, reply) => {
    const { instanceId, eventType } = req.params

    // Responder imediatamente (< 200ms)
    reply.status(200).send({ ok: true })

    // Encontrar número pelo instance ID
    const [number] = await sql`
      SELECT id FROM wa_numbers WHERE uazapi_instance_id = ${instanceId}
    `
    if (!number) return

    // Salvar evento bruto
    await sql`
      INSERT INTO webhook_events (wa_number_id, event_type, instance_id, payload)
      VALUES (${number.id}, ${eventType}, ${instanceId}, ${JSON.stringify(req.body)})
    `

    // Enfileirar para processamento assíncrono
    await enqueueWebhook({ waNumberId: number.id, eventType, payload: req.body })
  })

  // POST /webhook/stripe
  fastify.post('/webhook/stripe', async (req, reply) => {
    const sig    = req.headers['stripe-signature']
    const body   = req.rawBody || JSON.stringify(req.body)
    const event  = req.body

    // Idempotência
    const existing = await sql`SELECT id FROM stripe_events WHERE event_id = ${event.id}`
    if (existing.length > 0) return reply.status(200).send({ ok: true })

    await sql`
      INSERT INTO stripe_events (event_id, type, payload) VALUES (${event.id}, ${event.type}, ${JSON.stringify(event)})
    `

    // Processar eventos do Stripe
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object
        await sql`
          UPDATE tenants SET
            subscription_status = ${sub.status},
            stripe_sub_id = ${sub.id},
            updated_at = now()
          WHERE stripe_customer_id = ${sub.customer}
        `
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await sql`
          UPDATE tenants SET subscription_status = 'canceled', updated_at = now()
          WHERE stripe_customer_id = ${sub.customer}
        `
        break
      }
    }

    await sql`UPDATE stripe_events SET processed = true WHERE event_id = ${event.id}`
    return { ok: true }
  })
}

// ─── Broadcast Routes ─────────────────────────────────────────

export async function broadcastRoutes(fastify) {

  fastify.addHook('onRequest', authenticate)

  // GET /broadcasts
  fastify.get('/broadcasts', async (req) => {
    return sql`
      SELECT b.*, w.label AS number_label,
             ARRAY_AGG(g.name) FILTER (WHERE g.id IS NOT NULL) AS target_group_names
      FROM broadcasts b
      JOIN wa_numbers w ON w.id = b.wa_number_id
      LEFT JOIN broadcast_targets bt ON bt.broadcast_id = b.id
      LEFT JOIN groups g ON g.id = bt.group_id
      WHERE b.tenant_id = ${req.tenantId}
      GROUP BY b.id, w.label
      ORDER BY b.created_at DESC
      LIMIT 50
    `
  })

  // POST /broadcasts
  fastify.post('/broadcasts', async (req, reply) => {
    const {
      name, waNumberId, messagesPayload, targetGroups,
      scheduledAt, delayMin = 3, delayMax = 8, recurrence
    } = req.body

    const [broadcast] = await sql`
      INSERT INTO broadcasts (
        tenant_id, wa_number_id, created_by, name,
        messages_payload, delay_min, delay_max,
        scheduled_at, recurrence,
        status, total_targets
      ) VALUES (
        ${req.tenantId}, ${waNumberId}, ${req.userId}, ${name},
        ${JSON.stringify(messagesPayload)}, ${delayMin}, ${delayMax},
        ${scheduledAt || null}, ${recurrence ? JSON.stringify(recurrence) : null},
        ${scheduledAt ? 'scheduled' : 'draft'},
        ${targetGroups?.length || 0}
      )
      RETURNING *
    `

    // Inserir targets
    if (targetGroups?.length) {
      for (const groupId of targetGroups) {
        const [group] = await sql`SELECT wa_group_jid FROM groups WHERE id = ${groupId}`
        if (group) {
          await sql`
            INSERT INTO broadcast_targets (broadcast_id, group_id, wa_group_jid)
            VALUES (${broadcast.id}, ${groupId}, ${group.waGroupJid})
          `
        }
      }
    }

    return reply.status(201).send(broadcast)
  })

  // POST /broadcasts/:id/send — enviar agora
  fastify.post('/broadcasts/:id/send', async (req, reply) => {
    const [broadcast] = await sql`
      SELECT b.*, w.uazapi_token FROM broadcasts b
      JOIN wa_numbers w ON w.id = b.wa_number_id
      WHERE b.id = ${req.params.id} AND b.tenant_id = ${req.tenantId}
    `
    if (!broadcast) return reply.status(404).send({ error: 'Not found' })

    const targets = await sql`
      SELECT * FROM broadcast_targets WHERE broadcast_id = ${broadcast.id}
    `

    // Montar mensagens para o sender/advanced
    const messages = []
    for (const target of targets) {
      for (const msg of broadcast.messagesPayload) {
        messages.push({
          ...msg,
          number: target.waGroupJid,
          text: msg.text
            ?.replace(/\{\{nome_grupo\}\}/g, target.groupName || '')
            ?.replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR')),
        })
      }
    }

    const result = await uazapi.createAdvancedCampaign(broadcast.uazapiToken, {
      info:        broadcast.name,
      delayMin:    broadcast.delayMin,
      delayMax:    broadcast.delayMax,
      messages,
      scheduledFor: 1,
    })

    await sql`
      UPDATE broadcasts SET
        status = 'sending',
        uazapi_folder_id = ${result.folder_id || result.id},
        sent_at = now(),
        updated_at = now()
      WHERE id = ${broadcast.id}
    `

    return { success: true, folderId: result.folder_id }
  })

  // POST /broadcasts/:id/cancel
  fastify.post('/broadcasts/:id/cancel', async (req, reply) => {
    const [broadcast] = await sql`
      SELECT b.*, w.uazapi_token FROM broadcasts b
      JOIN wa_numbers w ON w.id = b.wa_number_id
      WHERE b.id = ${req.params.id} AND b.tenant_id = ${req.tenantId}
    `
    if (!broadcast) return reply.status(404).send({ error: 'Not found' })

    if (broadcast.uazapiFolderId) {
      await uazapi.controlCampaign(broadcast.uazapiToken, broadcast.uazapiFolderId, 'delete')
    }

    await sql`UPDATE broadcasts SET status = 'canceled', updated_at = now() WHERE id = ${broadcast.id}`
    return { success: true }
  })

  // GET /broadcasts/:id/report
  fastify.get('/broadcasts/:id/report', async (req) => {
    const targets = await sql`
      SELECT bt.*, g.name AS group_name
      FROM broadcast_targets bt
      LEFT JOIN groups g ON g.id = bt.group_id
      WHERE bt.broadcast_id = ${req.params.id}
      ORDER BY bt.created_at ASC
    `
    return targets
  })
}
