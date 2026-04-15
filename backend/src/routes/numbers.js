import sql from '../db/connection.js'
import { authenticate } from '../middleware/auth.js'
import * as uazapi from '../services/uazapi.js'
import { syncGroupsForNumber, syncMessagesForNumber, syncContactsForNumber } from '../services/syncService.js'

export default async function numberRoutes(fastify) {

  fastify.addHook('onRequest', authenticate)

  // GET /numbers
  fastify.get('/numbers', async (req) => {
    return sql`
      SELECT id, label, phone_number, status, profile_name, profile_pic_url,
             is_business, platform, msg_delay_min, msg_delay_max,
             last_connected_at, last_disconnect_at, last_disconnect_reason,
             created_at,
             (SELECT COUNT(*) FROM groups g WHERE g.wa_number_id = wa_numbers.id AND g.is_monitored) AS group_count
      FROM wa_numbers
      WHERE tenant_id = ${req.tenantId}
      ORDER BY created_at ASC
    `
  })

  // POST /numbers
  fastify.post('/numbers', async (req, reply) => {
    const { label } = req.body

    // Verificar limite do plano
    const [tenant] = await sql`
      SELECT t.*, p.max_numbers FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.id = ${req.tenantId}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM wa_numbers WHERE tenant_id = ${req.tenantId}
    `

    if (parseInt(count) >= (tenant?.maxNumbers || 1)) {
      return reply.status(403).send({ error: 'Número máximo de instâncias atingido para seu plano' })
    }

    // Criar instância na uazapi
    const instanceName = `gs_${req.tenantId.slice(0, 8)}_${Date.now()}`
    const result = await uazapi.createInstance(instanceName, req.tenantId)

    const instanceId = result.instance?.id || result.name || instanceName
    const instanceToken = result.token || result.instance?.token

    if (!instanceToken) {
      return reply.status(502).send({ error: 'Falha ao criar instância na uazapi: token não retornado' })
    }

    // Configurar webhook
    const webhookUrl = process.env.API_URL || 'http://localhost:3001'
    await uazapi.configureWebhook(instanceToken, instanceId, webhookUrl)

    const [number] = await sql`
      INSERT INTO wa_numbers (
        tenant_id, label, uazapi_instance_id, uazapi_token, status, created_by
      ) VALUES (
        ${req.tenantId}, ${label || 'Meu Número'},
        ${instanceId}, ${instanceToken}, 'disconnected', ${req.userId}
      )
      RETURNING *
    `

    return reply.status(201).send(number)
  })

  // GET /numbers/:id
  fastify.get('/numbers/:id', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })
    return number
  })

  // GET /numbers/:id/qr — Status + QR code
  fastify.get('/numbers/:id/qr', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    // Buscar status atual da uazapi
    const result = await uazapi.getInstanceStatus(number.uazapiToken)

    const inst = result.instance || result
    const connStatus = inst.status || (result.status?.connected ? 'connected' : 'disconnected')
    const phoneNumber = result.status?.jid?.user || inst.phoneNumber || null

    // Atualizar no banco
    const wasDisconnected = number.status !== 'connected'
    await sql`
      UPDATE wa_numbers SET
        status    = ${connStatus || number.status},
        qr_code   = ${inst.qrcode || null},
        pair_code = ${inst.paircode || null},
        phone_number = COALESCE(${phoneNumber}, phone_number),
        profile_name = COALESCE(${inst.profileName || null}, profile_name),
        is_business = COALESCE(${inst.isBusiness ?? null}, is_business),
        last_connected_at = ${connStatus === 'connected' && wasDisconnected ? sql`now()` : sql`last_connected_at`},
        updated_at = now()
      WHERE id = ${number.id}
    `

    // Auto-sync grupos + mensagens + contatos quando acabou de conectar
    if (connStatus === 'connected' && wasDisconnected) {
      syncGroupsForNumber(number, req.tenantId, false)
        .then(() => syncMessagesForNumber(number, req.tenantId))
        .then(() => syncContactsForNumber(number, req.tenantId))
        .catch(() => {})
    }

    return {
      status: connStatus,
      qr_code: inst.qrcode,
      pair_code: inst.paircode,
      phone_number: phoneNumber,
    }
  })

  // POST /numbers/:id/connect
  fastify.post('/numbers/:id/connect', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    const result = await uazapi.connectInstance(number.uazapiToken, req.body?.phone)
    const inst = result.instance || result

    await sql`UPDATE wa_numbers SET status = 'connecting', updated_at = now() WHERE id = ${number.id}`

    return { qr_code: inst.qrcode, pair_code: inst.paircode, status: 'connecting' }
  })

  // POST /numbers/:id/disconnect
  fastify.post('/numbers/:id/disconnect', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    await uazapi.disconnectInstance(number.uazapiToken)
    await sql`UPDATE wa_numbers SET status = 'disconnected', updated_at = now() WHERE id = ${number.id}`

    return { success: true }
  })

  // POST /numbers/:id/reconnect
  fastify.post('/numbers/:id/reconnect', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    await uazapi.resetInstance(number.uazapiToken)
    return { success: true }
  })

  // DELETE /numbers/:id
  fastify.delete('/numbers/:id', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    try { await uazapi.disconnectInstance(number.uazapiToken) } catch {}

    await sql`DELETE FROM wa_numbers WHERE id = ${number.id}`
    return { success: true }
  })

  // POST /numbers/:id/sync-groups — sincronizar grupos do número
  fastify.post('/numbers/:id/sync-groups', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    const synced = await syncGroupsForNumber(number, req.tenantId, req.body?.force)

    // Baixar mensagens em background após sync
    syncMessagesForNumber(number, req.tenantId).catch(() => {})

    return { synced }
  })

  // POST /numbers/:id/sync-contacts — sincronizar contatos do número
  fastify.post('/numbers/:id/sync-contacts', async (req, reply) => {
    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Not found' })

    const synced = await syncContactsForNumber(number, req.tenantId)
    return { synced }
  })
}
