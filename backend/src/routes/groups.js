import sql from '../db/connection.js'
import { authenticate, loadTenantPlan, requireFeature } from '../middleware/auth.js'
import * as uazapi from '../services/uazapi.js'
import { cacheGet, cacheSet, cacheDel } from '../db/redis.js'

// Extrai phone do JID ou do uazapi_id como fallback
function extractPhone(sender, uazapiId) {
  if (sender) {
    const cleaned = sender.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '').slice(-13)
    return cleaned || null
  }
  const prefix = String(uazapiId).split(':')[0]
  return /^\d{8,15}$/.test(prefix) ? prefix : null
}

// Tenta múltiplos nomes de campo para o nome do remetente
function extractName(m) {
  return m.senderName || m.pushname || m.notifyName || m.author || m.name || null
}

export default async function groupRoutes(fastify) {

  fastify.addHook('onRequest', authenticate)

  // GET /groups
  fastify.get('/groups', async (req) => {
    const { page = 1, limit = 20, search, tags, monitored, all } = req.query
    const offset = (page - 1) * limit

    // By default, show only monitored groups unless ?all=true is passed (admin/debug)
    const monitoredFilter = all === 'true' ? null : true

    const rows = await sql`
      SELECT
        g.*,
        w.label AS number_label, w.phone_number,
        (SELECT heat_score FROM group_daily_scores s
         WHERE s.group_id = g.id ORDER BY s.date DESC LIMIT 1) AS heat_score,
        (SELECT COUNT(*) FROM group_alerts a
         WHERE a.group_id = g.id AND a.resolved_at IS NULL) AS unresolved_alerts,
        (SELECT COUNT(*) FROM messages m
         WHERE m.group_id = g.id
           AND m.sent_at >= CURRENT_DATE) AS messages_today
      FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.tenant_id = ${req.tenantId}
        AND g.is_archived = false
        ${monitoredFilter !== null ? sql`AND g.is_monitored = ${monitoredFilter}` : sql``}
        ${search ? sql`AND g.name ILIKE ${'%' + search + '%'}` : sql``}
        ${monitored !== undefined && all === 'true' ? sql`AND g.is_monitored = ${monitored === 'true'}` : sql``}
      ORDER BY g.last_message_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM groups
      WHERE tenant_id = ${req.tenantId} AND is_archived = false
        ${monitoredFilter !== null ? sql`AND is_monitored = ${monitoredFilter}` : sql``}
    `

    return { data: rows, meta: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit) } }
  })

  // GET /groups/:id
  fastify.get('/groups/:id', async (req, reply) => {
    const [group] = await sql`
      SELECT g.*, w.label AS number_label, w.phone_number, w.uazapi_token,
             (SELECT heat_score FROM group_daily_scores WHERE group_id = g.id ORDER BY date DESC LIMIT 1) AS heat_score
      FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })
    return group
  })

  // PATCH /groups/:id
  fastify.patch('/groups/:id', async (req, reply) => {
    const { tags, isMonitored, alertKeywords, label } = req.body

    // Enforce group limit before activating monitoring
    if (isMonitored === true) {
      const plan = await loadTenantPlan(req.tenantId)
      const maxGroups = plan?.maxGroups ?? 10
      const extraGroups = plan?.extraGroupsPurchased ?? 0
      const effectiveLimit = maxGroups === -1 ? Infinity : maxGroups + extraGroups

      if (effectiveLimit !== Infinity) {
        const [{ count }] = await sql`
          SELECT COUNT(*) FROM groups
          WHERE tenant_id = ${req.tenantId} AND is_monitored = true AND is_archived = false AND id != ${req.params.id}
        `
        if (parseInt(count) >= effectiveLimit) {
          const extraPrice = maxGroups > 0
            ? Math.round((plan?.priceCents || 0) / maxGroups)
            : 0
          return reply.status(403).send({
            error: 'plan_limit_reached',
            limit: effectiveLimit,
            current: parseInt(count),
            extraGroupPriceCents: extraPrice,
            message: `Limite de ${effectiveLimit} grupos atingido.`,
          })
        }
      }
    }

    const [group] = await sql`
      UPDATE groups SET
        tags           = COALESCE(${tags || null}::text[], tags),
        is_monitored   = COALESCE(${isMonitored ?? null}, is_monitored),
        alert_keywords = COALESCE(${alertKeywords || null}::text[], alert_keywords),
        updated_at     = now()
      WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
      RETURNING *
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })
    return group
  })

  // POST /groups/create — criar grupo novo no WA
  fastify.post('/groups/create', async (req, reply) => {
    const { waNumberId, name, participants } = req.body

    const [number] = await sql`
      SELECT * FROM wa_numbers WHERE id = ${waNumberId} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Number not found' })

    const result = await uazapi.createGroup(number.uazapiToken, name, participants)

    // Salvar no banco
    const [group] = await sql`
      INSERT INTO groups (tenant_id, wa_number_id, wa_group_jid, name)
      VALUES (${req.tenantId}, ${number.id}, ${result.JID || result.id}, ${name})
      RETURNING *
    `

    return reply.status(201).send(group)
  })

  // GET /groups/:id/members
  fastify.get('/groups/:id/members', async (req) => {
    return sql`
      SELECT gm.*, c.name AS contact_name, c.email AS contact_email
      FROM group_members gm
      LEFT JOIN contacts c ON c.phone_number = gm.phone_number AND c.tenant_id = ${req.tenantId}
      WHERE gm.group_id = ${req.params.id} AND gm.tenant_id = ${req.tenantId}
        AND gm.is_active = true
      ORDER BY gm.is_admin DESC, gm.push_name ASC
    `
  })

  // POST /groups/:id/members
  fastify.post('/groups/:id/members', async (req, reply) => {
    const { participants, action = 'add' } = req.body

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    await uazapi.updateGroupParticipants(group.uazapiToken, group.waGroupJid, action, participants)
    return { success: true, action, count: participants.length }
  })

  // GET /groups/:id/info — informações detalhadas do grupo via WA (com invite link)
  fastify.get('/groups/:id/info', async (req, reply) => {
    const [group] = await sql`
      SELECT g.*, w.uazapi_token, w.phone_number AS wa_phone
      FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    try {
      const info = await uazapi.getGroupInfo(group.uazapiToken, group.waGroupJid, true)

      // Verificar se somos admin
      const myJid = group.waPhone + '@s.whatsapp.net'
      const participants = info.Participants || info.participants || []
      const me = participants.find(p => (p.ID || p.id || '').includes(group.waPhone))
      const isAdmin = me?.IsAdmin || me?.isSuperAdmin || false

      return {
        ...info,
        isAdmin,
        inviteLink: info.InviteLink || info.inviteLink || null,
        description: info.Description || info.description || group.description,
        memberCount: participants.length || group.memberCount,
      }
    } catch (err) {
      return reply.status(502).send({ error: 'Erro ao obter info do grupo: ' + err.message })
    }
  })

  // PATCH /groups/:id/name — atualizar nome do grupo no WA
  fastify.patch('/groups/:id/name', async (req, reply) => {
    const { name } = req.body
    if (!name) return reply.status(400).send({ error: 'Nome é obrigatório' })

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    await uazapi.updateGroupName(group.uazapiToken, group.waGroupJid, name)
    await sql`UPDATE groups SET name = ${name}, updated_at = now() WHERE id = ${group.id}`
    return { success: true }
  })

  // PATCH /groups/:id/description — atualizar descrição do grupo no WA
  fastify.patch('/groups/:id/description', async (req, reply) => {
    const { description } = req.body

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    await uazapi.updateGroupDescription(group.uazapiToken, group.waGroupJid, description)
    await sql`UPDATE groups SET description = ${description}, updated_at = now() WHERE id = ${group.id}`
    return { success: true }
  })

  // PATCH /groups/:id/image — atualizar foto do grupo
  fastify.patch('/groups/:id/image', async (req, reply) => {
    const { image } = req.body // base64 ou URL
    if (!image) return reply.status(400).send({ error: 'Imagem é obrigatória' })

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    await uazapi.updateGroupImage(group.uazapiToken, group.waGroupJid, image)
    return { success: true }
  })

  // PATCH /groups/:id/settings — configurações do grupo (announce, locked)
  fastify.patch('/groups/:id/settings', async (req, reply) => {
    const { announce, locked } = req.body

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    if (announce !== undefined) {
      await uazapi.setGroupAnnounce(group.uazapiToken, group.waGroupJid, announce)
      await sql`UPDATE groups SET is_announce = ${announce} WHERE id = ${group.id}`
    }
    if (locked !== undefined) {
      await uazapi.setGroupLocked(group.uazapiToken, group.waGroupJid, locked)
      await sql`UPDATE groups SET is_locked = ${locked} WHERE id = ${group.id}`
    }

    return { success: true }
  })

  // POST /groups/:id/leave — sair do grupo
  fastify.post('/groups/:id/leave', async (req, reply) => {
    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    await uazapi.leaveGroup(group.uazapiToken, group.waGroupJid)
    await sql`UPDATE groups SET is_archived = true, updated_at = now() WHERE id = ${group.id}`
    return { success: true }
  })

  // GET /groups/:id/messages
  fastify.get('/groups/:id/messages', async (req) => {
    const { page = 1, limit = 50, date, force } = req.query
    const cacheKey = `messages:${req.params.id}:${req.tenantId}:${page}:${limit}:${date || ''}`

    if (!force) {
      const cached = await cacheGet(cacheKey)
      if (cached) return cached
    }

    const offset = (page - 1) * limit

    const where = date
      ? sql`AND DATE(sent_at) = ${date}::date`
      : sql``

    const rows = await sql`
      SELECT id, uazapi_id, sender_name, sender_phone, message_type,
             body, file_url, is_from_me, was_sent_by_api, quoted_id,
             status, sentiment, sent_at
      FROM messages
      WHERE group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
        ${where}
      ORDER BY sent_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM messages
      WHERE group_id = ${req.params.id} AND tenant_id = ${req.tenantId} ${where}
    `

    const result = { data: rows.reverse(), meta: { total: parseInt(count), page: parseInt(page) } }
    await cacheSet(cacheKey, result, 30)
    return result
  })

  // POST /groups/:id/sync-messages — sincroniza mensagens de um grupo específico do uazapi
  fastify.post('/groups/:id/sync-messages', async (req, reply) => {
    const [group] = await sql`
      SELECT g.*, w.uazapi_token, w.id as number_id
      FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    const result = await uazapi.findMessages(group.uazapiToken, group.waGroupJid, 50, 0)
    const msgs = result?.messages || []
    let synced = 0

    for (const m of msgs) {
      if (!m.id) continue
      const uazapiId = String(m.id).slice(0, 30)
      const senderPhone = extractPhone(m.sender || m.from, uazapiId)
      const senderName = extractName(m)
      await sql`
        INSERT INTO messages (
          tenant_id, group_id, wa_number_id, uazapi_id, wa_message_id,
          wa_chat_id, sender_jid, sender_name, sender_phone, message_type, body,
          file_url, is_from_me, is_group, status, sent_at
        ) VALUES (
          ${req.tenantId}, ${group.id}, ${group.numberId}, ${uazapiId}, ${m.messageid || m.id},
          ${m.chatid || group.waGroupJid}, ${m.sender || m.from || null}, ${senderName},
          ${senderPhone}, ${m.messageType || 'conversation'}, ${m.text || m.caption || null},
          ${m.fileURL || m.fileUrl || null}, ${m.fromMe || false}, true,
          ${m.status || 'received'},
          ${m.messageTimestamp ? new Date(m.messageTimestamp > 9999999999 ? m.messageTimestamp : m.messageTimestamp * 1000) : new Date()}
        )
        ON CONFLICT (uazapi_id) DO NOTHING
      `
      synced++
    }

    // Retroativo: preencher sender_phone a partir do uazapi_id em mensagens já salvas
    await sql`
      UPDATE messages
      SET sender_phone = SPLIT_PART(uazapi_id, ':', 1)
      WHERE group_id   = ${group.id}
        AND tenant_id  = ${req.tenantId}
        AND sender_phone IS NULL
        AND is_from_me = false
        AND uazapi_id LIKE '%:%'
        AND SPLIT_PART(uazapi_id, ':', 1) ~ '^[0-9]{8,15}$'
    `

    await cacheDel(`messages:${group.id}:${req.tenantId}:1:50:`)
    return { synced }
  })

  // POST /groups/:id/messages — enviar mensagem
  fastify.post('/groups/:id/messages', async (req, reply) => {
    const { text, type = 'text', file, mediaType } = req.body

    const [group] = await sql`
      SELECT g.*, w.uazapi_token FROM groups g
      JOIN wa_numbers w ON w.id = g.wa_number_id
      WHERE g.id = ${req.params.id} AND g.tenant_id = ${req.tenantId}
    `
    if (!group) return reply.status(404).send({ error: 'Not found' })

    let result
    if (type === 'text') {
      result = await uazapi.sendText(group.uazapiToken, group.waGroupJid, text)
    } else {
      result = await uazapi.sendMedia(group.uazapiToken, group.waGroupJid, mediaType || type, file, text)
    }

    return result
  })

  // GET /groups/:id/alerts
  fastify.get('/groups/:id/alerts', async (req) => {
    return sql`
      SELECT * FROM group_alerts
      WHERE group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
      ORDER BY created_at DESC
      LIMIT 50
    `
  })

  // PATCH /groups/:id/alerts/:alertId/resolve
  fastify.patch('/groups/:id/alerts/:alertId/resolve', async (req) => {
    await sql`
      UPDATE group_alerts SET resolved_at = now()
      WHERE id = ${req.params.alertId}
        AND group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
    `
    return { success: true }
  })

  // GET /groups/:id/summary — resumo IA
  fastify.get('/groups/:id/summary', async (req) => {
    const { date, period = 'daily' } = req.query
    const targetDate = date || new Date().toISOString().slice(0, 10)

    const [summary] = await sql`
      SELECT * FROM ai_summaries
      WHERE group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
        AND date = ${targetDate}::date
        AND period = ${period}
    `
    return summary || null
  })

  // POST /groups/:id/summary/generate — forçar geração (feature gate: ai_sentiment)
  fastify.post('/groups/:id/summary/generate', { preHandler: [requireFeature('ai_sentiment')] }, async (req, reply) => {
    const { generateDailySummary } = await import('../services/ai.js')
    const date = req.body?.date || new Date().toISOString().slice(0, 10)

    try {
      const summary = await generateDailySummary(req.params.id, date)
      if (!summary) return reply.status(204).send()
      return summary
    } catch (err) {
      req.log.error({ err, groupId: req.params.id, date }, 'Erro ao gerar resumo IA')
      return reply.status(500).send({ error: err.message || 'Erro ao gerar resumo com IA' })
    }
  })
}
