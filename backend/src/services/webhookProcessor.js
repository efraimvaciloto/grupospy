import sql from '../db/connection.js'
import { enqueueAI, publishRealtimeEvent } from '../db/redis.js'
import { syncGroupsForNumber, syncMessagesForNumber, syncContactsForNumber } from './syncService.js'

// Mapeador: Message uazapi → nossa tabela
function mapMessage(m, groupId, waNumberId, tenantId) {
  const senderPhone = m.sender
    ? m.sender.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '').slice(-13)
    : null

  return {
    tenantId,
    groupId,
    waNumberId,
    uazapiId:     m.id,
    waMessageId:  m.messageid,
    waChatId:     m.chatid,
    senderJid:    m.sender,
    senderName:   m.senderName,
    senderPhone,
    messageType:  m.messageType || 'conversation',
    body:         m.text || m.caption || null,
    fileUrl:      m.fileURL || m.fileUrl || m.file || m.mediaUrl || m.media || null,
    isFromMe:     m.fromMe || false,
    isGroup:      m.isGroup || true,
    wasSentByApi: m.wasSentByApi || false,
    quotedId:     m.quoted || null,
    reactionToId: m.reaction || null,
    trackSource:  m.track_source || null,
    trackId:      m.track_id || null,
    sendFolderId: m.send_folder_id || null,
    status:       m.status || null,
    sentAt:       new Date(m.messageTimestamp || Date.now()),
  }
}

// ─── Handler principal ────────────────────────────────────────

export async function processWebhookEvent(waNumberId, eventType, payload) {
  const [waNumber] = await sql`
    SELECT id, tenant_id, uazapi_instance_id FROM wa_numbers WHERE id = ${waNumberId}
  `
  if (!waNumber) return

  switch (eventType) {

    case 'connection':
      await handleConnection(waNumber, payload)
      break

    case 'messages':
      await handleMessages(waNumber, payload)
      break

    case 'messages_update':
      await handleMessagesUpdate(payload)
      break

    case 'groups':
      await handleGroupsUpdate(waNumber, payload)
      break

    case 'sender':
      await handleSenderUpdate(payload)
      break

    case 'contacts':
      await handleContactsUpdate(waNumber, payload)
      break

    case 'chats':
      await handleChatsUpdate(waNumber, payload)
      break

    case 'history':
      await handleHistorySync(waNumber, payload)
      break
  }
}

// ─── Connection ───────────────────────────────────────────────

async function handleConnection(waNumber, data) {
  const statusMap = {
    open: 'connected',
    close: 'disconnected',
    connecting: 'connecting',
  }
  const status = statusMap[data.status] || data.status

  await sql`
    UPDATE wa_numbers SET
      status                 = ${status},
      qr_code                = ${data.qrcode || null},
      pair_code              = ${data.paircode || null},
      profile_name           = ${data.profileName || null},
      profile_pic_url        = ${data.profilePicUrl || null},
      is_business            = ${data.isBusiness || false},
      platform               = ${data.plataform || null},
      last_connected_at      = CASE WHEN ${status} = 'connected' THEN now() ELSE last_connected_at END,
      last_disconnect_at     = CASE WHEN ${status} = 'disconnected' THEN now() ELSE last_disconnect_at END,
      last_disconnect_reason = ${data.lastDisconnectReason || null},
      updated_at             = now()
    WHERE id = ${waNumber.id}
  `

  // Disparar sync em background quando conectar
  if (status === 'connected') {
    const [fullNumber] = await sql`SELECT * FROM wa_numbers WHERE id = ${waNumber.id}`
    if (fullNumber) {
      syncGroupsForNumber(fullNumber, waNumber.tenantId, false)
        .then(() => syncMessagesForNumber(fullNumber, waNumber.tenantId))
        .then(() => syncContactsForNumber(fullNumber, waNumber.tenantId))
        .catch(err => console.error('[Webhook] Sync error on connect:', err.message))

      await publishRealtimeEvent(waNumber.tenantId, {
        type: 'number:connected',
        waNumberId: waNumber.id,
      })
    }
  }

  // Alerta se desconectou inesperadamente
  if (status === 'disconnected') {
    await sql`
      INSERT INTO notifications (tenant_id, type, title, body, metadata)
      VALUES (
        ${waNumber.tenantId}, 'connection_lost',
        'Número desconectado',
        ${'O número ' + (waNumber.phoneNumber || waNumber.uazapiInstanceId) + ' foi desconectado.'},
        ${JSON.stringify({ waNumberId: waNumber.id })}
      )
    `
  }
}

// ─── Messages ─────────────────────────────────────────────────

async function handleMessages(waNumber, data) {
  const msgs = Array.isArray(data) ? data : [data]

  for (const m of msgs) {
    if (!m.isGroup || !m.chatid) continue

    // Encontrar o grupo pelo JID
    const [group] = await sql`
      SELECT id, alert_keywords FROM groups
      WHERE wa_number_id = ${waNumber.id}
        AND wa_group_jid = ${m.chatid}
    `

    if (!group) continue

    const mapped = mapMessage(m, group.id, waNumber.id, waNumber.tenantId)

    // Insert (ignora duplicatas pelo uazapi_id)
    await sql`
      INSERT INTO messages ${sql(mapped)}
      ON CONFLICT (uazapi_id) DO NOTHING
    `

    publishRealtimeEvent(waNumber.tenantId, {
      type: 'group:message',
      groupId: group.id,
      message: { ...mapped, id: mapped.uazapiId },
    })

    // Verificar se o remetente é membro da equipe
    let isTeamMember = mapped.isFromMe
    if (!isTeamMember && mapped.senderPhone) {
      const [teamCheck] = await sql`
        SELECT 1 FROM contacts
        WHERE tenant_id = ${waNumber.tenantId}
          AND phone_number = ${mapped.senderPhone}
          AND is_team_member = true
      `
      isTeamMember = !!teamCheck
    }

    // Atualizar last_message_at do grupo
    await sql`
      UPDATE groups SET
        last_message_at   = ${mapped.sentAt},
        last_msg_type     = ${mapped.messageType},
        unread_count      = COALESCE(unread_count, 0) + CASE WHEN ${!mapped.isFromMe} THEN 1 ELSE 0 END,
        last_admin_msg_at = CASE WHEN ${mapped.isFromMe} THEN ${mapped.sentAt} ELSE last_admin_msg_at END,
        last_team_msg_at  = CASE WHEN ${isTeamMember} THEN ${mapped.sentAt} ELSE last_team_msg_at END,
        updated_at        = now()
      WHERE id = ${group.id}
    `

    // Auto-resolver alertas no_response quando equipe responde
    if (isTeamMember) {
      await sql`
        UPDATE group_alerts SET resolved_at = now()
        WHERE group_id = ${group.id}
          AND type = 'no_response'
          AND resolved_at IS NULL
      `
    }

    // Verificar keywords de alerta
    if (mapped.body && group.alertKeywords?.length > 0) {
      const bodyLower = mapped.body.toLowerCase()
      const matched   = group.alertKeywords.filter(kw => bodyLower.includes(kw.toLowerCase()))

      if (matched.length > 0) {
        await sql`
          INSERT INTO group_alerts (group_id, tenant_id, type, severity, title, description, metadata)
          VALUES (
            ${group.id}, ${waNumber.tenantId}, 'keyword', 'high',
            ${'Palavra-chave detectada: ' + matched.join(', ')},
            ${mapped.body.slice(0, 500)},
            ${JSON.stringify({ keywords: matched, senderName: mapped.senderName, messageId: mapped.uazapiId })}
          )
        `

        publishRealtimeEvent(waNumber.tenantId, {
          type: 'group:alert',
          groupId: group.id,
        })
      }
    }

    // Enfileirar para análise de sentimento (baixa prioridade)
    await enqueueAI({ type: 'sentiment', groupId: group.id, tenantId: waNumber.tenantId }, { priority: 8 })
  }
}

// ─── Messages Update (status de entrega) ─────────────────────

async function handleMessagesUpdate(data) {
  const updates = Array.isArray(data) ? data : [data]
  for (const u of updates) {
    if (u.id && u.status) {
      await sql`UPDATE messages SET status = ${u.status} WHERE uazapi_id = ${u.id}`
    }
  }
}

// ─── Groups Update (mudança de nome, membros, etc.) ───────────

async function handleGroupsUpdate(waNumber, data) {
  const updates = Array.isArray(data) ? data : [data]

  for (const u of updates) {
    if (!u.id && !u.JID) continue
    const groupJid = u.id || u.JID

    await sql`
      INSERT INTO groups (tenant_id, wa_number_id, wa_group_jid, name, member_count, is_announce, is_locked, avatar_url)
      VALUES (
        ${waNumber.tenantId}, ${waNumber.id}, ${groupJid},
        ${u.name || u.Name || 'Grupo'},
        ${u.participants?.length || u.Participants?.length || 0},
        ${u.IsAnnounce ?? false}, ${u.IsLocked ?? false},
        ${u.profilePicUrl || u.GroupPicture || u.picture || null}
      )
      ON CONFLICT (wa_number_id, wa_group_jid) DO UPDATE SET
        name         = COALESCE(EXCLUDED.name, groups.name),
        member_count = CASE WHEN EXCLUDED.member_count > 0 THEN EXCLUDED.member_count ELSE groups.member_count END,
        is_announce  = COALESCE(EXCLUDED.is_announce, groups.is_announce),
        is_locked    = COALESCE(EXCLUDED.is_locked, groups.is_locked),
        avatar_url   = COALESCE(EXCLUDED.avatar_url, groups.avatar_url),
        updated_at   = now()
    `

    publishRealtimeEvent(waNumber.tenantId, {
      type: 'group:updated',
      groupJid,
    })
  }
}

// ─── Sender Update (status de campanha) ──────────────────────

async function handleSenderUpdate(data) {
  if (!data.folder_id) return

  await sql`
    UPDATE broadcasts SET
      status        = COALESCE(${data.status || null}, status),
      total_sent    = COALESCE(${data.sent || null}, total_sent),
      total_failed  = COALESCE(${data.failed || null}, total_failed),
      updated_at    = now()
    WHERE uazapi_folder_id = ${data.folder_id}
  `
}

// ─── Contacts Update ─────────────────────────────────────────

async function handleContactsUpdate(waNumber, data) {
  const contacts = Array.isArray(data) ? data : [data]
  for (const c of contacts) {
    const raw = c.phone || c.number || c.jid || c.id || ''
    const phone = raw.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')
    if (!phone || phone.length < 8) continue
    const name = c.contact_name || c.contactName || c.name || c.pushname || c.notify || null
    await sql`
      INSERT INTO contacts (tenant_id, name, phone_number, wa_valid, imported_from)
      VALUES (${waNumber.tenantId}, ${name || phone}, ${phone}, true, 'webhook')
      ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
        name = COALESCE(NULLIF(EXCLUDED.name, EXCLUDED.phone_number), contacts.name),
        wa_valid = true,
        updated_at = now()
    `
  }
}

// ─── Chats Update ────────────────────────────────────────────

async function handleChatsUpdate(waNumber, data) {
  const chats = Array.isArray(data) ? data : [data]

  for (const c of chats) {
    if (!c.wa_chatid || !c.wa_isGroup) continue

    await sql`
      UPDATE groups SET
        unread_count = COALESCE(${c.wa_unreadCount ?? null}, unread_count),
        is_announce  = COALESCE(${c.wa_isGroup_announce ?? null}, is_announce),
        is_pinned    = COALESCE(${c.wa_isPinned ?? null}, is_pinned),
        updated_at   = now()
      WHERE wa_number_id = ${waNumber.id}
        AND wa_group_jid = ${c.wa_chatid}
    `
  }
}

// ─── History Sync ────────────────────────────────────────────

async function handleHistorySync(waNumber, data) {
  const msgs = Array.isArray(data) ? data : data.messages || []

  for (const m of msgs) {
    if (!m.isGroup || !m.chatid) continue

    const [group] = await sql`
      SELECT id FROM groups
      WHERE wa_number_id = ${waNumber.id} AND wa_group_jid = ${m.chatid}
    `
    if (!group) continue

    const mapped = mapMessage(m, group.id, waNumber.id, waNumber.tenantId)
    await sql`INSERT INTO messages ${sql(mapped)} ON CONFLICT (uazapi_id) DO NOTHING`
  }
}
