import sql from '../db/connection.js'
import * as uazapi from './uazapi.js'
import { publishRealtimeEvent } from '../db/redis.js'

// Sincroniza grupos de um numero WhatsApp e seus membros (com paginacao)
export async function syncGroupsForNumber(number, tenantId, force = false) {
  let synced = 0
  let offset = 0
  const pageSize = 500

  while (true) {
    const result = await uazapi.listGroups(number.uazapiToken, {
      force,
      noParticipants: false,
      limit: pageSize,
      offset,
    })
    const groupList = Array.isArray(result) ? result : (result?.groups || result?.data || [])

    // Log primeiro grupo para diagnostico de campos
    if (offset === 0 && groupList.length > 0) {
      const sample = groupList[0]
      console.log('[SyncGroups] Sample group keys:', Object.keys(sample))
      console.log('[SyncGroups] Sample participants keys:', sample.Participants?.[0] ? Object.keys(sample.Participants[0]) : sample.participants?.[0] ? Object.keys(sample.participants[0]) : 'NO_PARTICIPANTS')
      console.log('[SyncGroups] ParticipantCount:', sample.ParticipantCount, '| participants.length:', (sample.Participants || sample.participants || []).length)
    }

    if (groupList.length === 0) break

    for (const g of groupList) {
      const participants = g.Participants || g.participants || []
      const memberCount = participants.length || g.ParticipantCount || g.participantCount || 0

      const [row] = await sql`
        INSERT INTO groups (tenant_id, wa_number_id, wa_group_jid, name, avatar_url, is_announce, is_locked, member_count)
        VALUES (
          ${tenantId}, ${number.id},
          ${g.JID || g.id}, ${g.Name || g.name || 'Grupo'},
          ${g.GroupPicture || g.ProfilePictureUrl || g.profilePic || g.picture || null},
          ${g.IsAnnounce || g.isAnnounce || false}, ${g.IsLocked || g.isLocked || false},
          ${memberCount}
        )
        ON CONFLICT (wa_number_id, wa_group_jid) DO UPDATE SET
          name         = EXCLUDED.name,
          avatar_url   = COALESCE(EXCLUDED.avatar_url, groups.avatar_url),
          is_announce  = EXCLUDED.is_announce,
          is_locked    = EXCLUDED.is_locked,
          member_count = CASE WHEN EXCLUDED.member_count > 0 THEN EXCLUDED.member_count ELSE groups.member_count END,
          updated_at   = now()
        RETURNING id
      `

      const groupDbId = row.id

      // Sync membros do grupo
      for (const p of participants) {
        const phone = (p.ID || p.id || '').replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
        if (!phone) continue
        await sql`
          INSERT INTO group_members (group_id, tenant_id, phone_number, push_name, jid, is_admin)
          VALUES (${groupDbId}, ${tenantId}, ${phone}, ${p.Name || p.name || null}, ${p.ID || p.id || null}, ${p.IsAdmin || p.isSuperAdmin || false})
          ON CONFLICT (group_id, phone_number) DO UPDATE SET
            push_name = COALESCE(EXCLUDED.push_name, group_members.push_name),
            is_admin = EXCLUDED.is_admin,
            is_active = true
        `
      }

      synced++
    }

    if (groupList.length < pageSize) break
    offset += pageSize
  }

  await publishRealtimeEvent(tenantId, { type: 'groups:sync_complete', count: synced })

  return synced
}

// Baixa mensagens recentes de todos os grupos de um numero
export async function syncMessagesForNumber(number, tenantId) {
  const groups = await sql`
    SELECT id, wa_group_jid FROM groups
    WHERE wa_number_id = ${number.id} AND tenant_id = ${tenantId}
  `
  let total = 0
  for (const group of groups) {
    try {
      const result = await uazapi.findMessages(number.uazapiToken, group.waGroupJid, 50, 0)
      const msgs = result?.messages || []
      for (const m of msgs) {
        if (!m.id) continue
        await sql`
          INSERT INTO messages (
            tenant_id, group_id, wa_number_id, uazapi_id, wa_message_id,
            wa_chat_id, sender_jid, sender_name, message_type, body,
            file_url, is_from_me, is_group, status, sent_at
          ) VALUES (
            ${tenantId}, ${group.id}, ${number.id}, ${m.id}, ${m.messageid || m.id},
            ${m.chatid || group.waGroupJid}, ${m.sender || null}, ${m.senderName || null},
            ${m.messageType || 'text'}, ${m.text || m.caption || null},
            ${m.fileURL || m.fileUrl || m.file || m.mediaUrl || m.media || null}, ${m.fromMe || false}, ${m.isGroup ?? true},
            ${m.status || 'received'},
            ${m.messageTimestamp ? new Date(m.messageTimestamp > 9999999999 ? m.messageTimestamp : m.messageTimestamp * 1000) : new Date()}
          )
          ON CONFLICT (uazapi_id) DO NOTHING
        `
        total++
      }
      // Atualizar last_message_at do grupo
      if (msgs.length > 0) {
        await sql`
          UPDATE groups SET
            last_message_at = (SELECT MAX(sent_at) FROM messages WHERE group_id = ${group.id}),
            updated_at = now()
          WHERE id = ${group.id}
        `
      }
    } catch {}
  }
  await publishRealtimeEvent(tenantId, { type: 'messages:sync_complete', count: total })

  return total
}

// Sincroniza contatos do WhatsApp para o banco (com paginacao)
export async function syncContactsForNumber(number, tenantId) {
  let synced = 0
  let offset = 0
  const pageSize = 500

  while (true) {
    let result
    try {
      result = await uazapi.listContacts(number.uazapiToken, pageSize, offset)
    } catch (err) {
      console.error(`[SyncContacts] Erro ao listar contatos (offset=${offset}):`, err.message)
      break
    }

    // uazapi pode retornar array direto, ou { contacts: [] }, ou { data: [] }
    const contacts = Array.isArray(result) ? result
      : (result?.contacts || result?.data || [])

    // Log primeiro contato para diagnostico de campos
    if (offset === 0 && contacts.length > 0) {
      console.log('[SyncContacts] Sample contact keys:', Object.keys(contacts[0]))
      console.log('[SyncContacts] Sample contact data:', JSON.stringify(contacts[0]).slice(0, 500))
    }

    if (contacts.length === 0) break

    for (const c of contacts) {
      // uazapi pode usar campos: id, phone, number, jid
      const raw = c.phone || c.number || c.jid || c.id || ''
      const phone = raw.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 8) continue

      const name = c.contact_name || c.contactName || c.name || c.first_name || c.firstName || c.pushname || c.pushName || c.notify || c.verifiedName || null

      await sql`
        INSERT INTO contacts (tenant_id, name, phone_number, wa_valid, imported_from)
        VALUES (${tenantId}, ${name || phone}, ${phone}, true, 'whatsapp')
        ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
          name = COALESCE(NULLIF(EXCLUDED.name, ''), NULLIF(EXCLUDED.name, contacts.phone_number), contacts.name),
          wa_valid = true,
          imported_from = COALESCE(contacts.imported_from, 'whatsapp'),
          updated_at = now()
      `
      synced++
    }

    if (contacts.length < pageSize) break
    offset += pageSize
  }

  // Tambem importar contatos a partir dos membros dos grupos (garante cobertura completa)
  const groupMembers = await sql`
    SELECT DISTINCT gm.phone_number, gm.push_name
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE g.tenant_id = ${tenantId}
      AND gm.phone_number IS NOT NULL
      AND gm.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM contacts c
        WHERE c.tenant_id = ${tenantId} AND c.phone_number = gm.phone_number
      )
  `

  for (const gm of groupMembers) {
    if (!gm.phoneNumber || gm.phoneNumber.length < 8) continue
    await sql`
      INSERT INTO contacts (tenant_id, name, phone_number, wa_valid, is_group_member, imported_from)
      VALUES (${tenantId}, ${gm.pushName || gm.phoneNumber}, ${gm.phoneNumber}, true, true, 'group_sync')
      ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
        is_group_member = true,
        updated_at = now()
    `
    synced++
  }

  // Marcar contatos que sao membros de grupos
  await sql`
    UPDATE contacts SET is_group_member = true
    WHERE tenant_id = ${tenantId}
      AND is_group_member = false
      AND phone_number IN (SELECT DISTINCT phone_number FROM group_members WHERE tenant_id = ${tenantId})
  `

  // Emitir evento realtime
  await publishRealtimeEvent(tenantId, { type: 'contacts:sync', count: synced })

  return synced
}
