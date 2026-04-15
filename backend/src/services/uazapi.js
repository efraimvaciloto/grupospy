// Serviço central de integração com uazapiGO v2.0.1

const BASE_URL = process.env.UAZAPI_BASE_URL || 'https://api.uazapi.com'
const ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN

async function request(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' }

  if (token) headers['token'] = token
  else if (options.adminToken) headers['admintoken'] = ADMIN_TOKEN

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`uazapi ${path} → ${res.status}: ${err}`)
  }

  return res.json()
}

// ─── Instâncias ───────────────────────────────────────────────

export async function createInstance(name, tenantId) {
  return request('/instance/create', {
    method: 'POST',
    adminToken: true,
    body: { name, systemName: 'GrupoSpy', adminField01: tenantId },
  })
}

export async function getAllInstances() {
  return request('/instance/all', { adminToken: true })
}

export async function getInstanceStatus(token) {
  return request('/instance/status', {}, token)
}

export async function connectInstance(token, phone) {
  return request('/instance/connect', { method: 'POST', body: { phone } }, token)
}

export async function disconnectInstance(token) {
  return request('/instance/disconnect', { method: 'POST' }, token)
}

export async function resetInstance(token) {
  return request('/instance/reset', { method: 'POST' }, token)
}

export async function updateDelaySettings(token, delayMin, delayMax) {
  return request('/instance/updateDelaySettings', {
    method: 'POST',
    body: { msg_delay_min: delayMin, msg_delay_max: delayMax },
  }, token)
}

export async function getWaMessageLimits(token) {
  return request('/instance/wa_messages_limits', {}, token)
}

// ─── Webhook ──────────────────────────────────────────────────

export async function configureWebhook(token, instanceId, webhookBaseUrl) {
  return request('/webhook', {
    method: 'POST',
    body: {
      url: `${webhookBaseUrl}/webhook/uazapi/${instanceId}`,
      enabled: true,
      addUrlEvents: true,           // /webhook/uazapi/:id/messages
      events: [
        'connection', 'messages', 'messages_update',
        'groups', 'contacts', 'sender', 'chats', 'history'
      ],
      excludeMessages: ['isGroupNo'], // só grupos
    },
  }, token)
}

// ─── Grupos ───────────────────────────────────────────────────

export async function listGroups(token, opts = {}) {
  return request('/group/list', {
    method: 'POST',
    body: {
      force: opts.force || false,
      noParticipants: opts.noParticipants ?? true,
      limit: opts.limit || 500,
      offset: opts.offset ?? 0,
      search: opts.search || undefined,
    },
  }, token)
}

export async function getGroupInfo(token, groupjid, withInviteLink = false) {
  return request('/group/info', {
    method: 'POST',
    body: { groupjid, getInviteLink: withInviteLink, force: false },
  }, token)
}

export async function createGroup(token, name, participants) {
  return request('/group/create', {
    method: 'POST',
    body: { name, participants },
  }, token)
}

export async function updateGroupParticipants(token, groupjid, action, participants) {
  // action: add | remove | promote | demote
  return request('/group/updateParticipants', {
    method: 'POST',
    body: { groupjid, action, participants },
  }, token)
}

export async function updateGroupName(token, groupjid, name) {
  return request('/group/updateName', { method: 'POST', body: { groupjid, name } }, token)
}

export async function updateGroupDescription(token, groupjid, description) {
  return request('/group/updateDescription', { method: 'POST', body: { groupjid, description } }, token)
}

export async function updateGroupImage(token, groupjid, image) {
  return request('/group/updateImage', { method: 'POST', body: { groupjid, image } }, token)
}

export async function setGroupAnnounce(token, groupjid, announce) {
  return request('/group/updateAnnounce', { method: 'POST', body: { groupjid, announce } }, token)
}

export async function setGroupLocked(token, groupjid, locked) {
  return request('/group/updateLocked', { method: 'POST', body: { groupjid, locked } }, token)
}

export async function leaveGroup(token, groupjid) {
  return request('/group/leave', { method: 'POST', body: { groupjid } }, token)
}

export async function joinGroupByInvite(token, invitecode) {
  return request('/group/join', { method: 'POST', body: { invitecode } }, token)
}

export async function resetGroupInviteCode(token, groupjid) {
  return request('/group/resetInviteCode', { method: 'POST', body: { groupjid } }, token)
}

// ─── Mensagens ────────────────────────────────────────────────

export async function findMessages(token, chatid, limit = 50, offset = 0) {
  return request('/message/find', {
    method: 'POST',
    body: { chatid, limit, offset },
  }, token)
}

export async function sendText(token, number, text, opts = {}) {
  return request('/send/text', {
    method: 'POST',
    body: {
      number, text,
      async: opts.async || true,
      track_source: opts.trackSource || 'grupospy',
      track_id: opts.trackId,
      replyid: opts.replyid,
    },
  }, token)
}

export async function sendMedia(token, number, type, file, text = '', opts = {}) {
  return request('/send/media', {
    method: 'POST',
    body: { number, type, file, text, async: true, track_source: 'grupospy', ...opts },
  }, token)
}

export async function sendMenu(token, number, type, text, choices, opts = {}) {
  return request('/send/menu', {
    method: 'POST',
    body: { number, type, text, choices, ...opts },
  }, token)
}

export async function reactToMessage(token, number, messageId, emoji) {
  return request('/message/react', {
    method: 'POST',
    body: { number, text: emoji, id: messageId },
  }, token)
}

export async function markChatAsRead(token, number) {
  return request('/chat/read', { method: 'POST', body: { number, read: true } }, token)
}

export async function deleteMessage(token, messageId) {
  return request('/message/delete', { method: 'POST', body: { id: messageId } }, token)
}

export async function pinMessage(token, messageId, pin = true, durationSeconds = 86400) {
  return request('/message/pin', {
    method: 'POST',
    body: { id: messageId, pin, duration: durationSeconds },
  }, token)
}

export async function downloadMedia(token, messageId, opts = {}) {
  return request('/message/download', {
    method: 'POST',
    body: {
      id: messageId,
      return_link: opts.returnLink || true,
      transcribe: opts.transcribe || false,
      openai_apikey: opts.transcribe ? process.env.OPENAI_API_KEY : undefined,
    },
  }, token)
}

export async function requestHistorySync(token, number, count = 100) {
  return request('/message/history-sync', {
    method: 'POST',
    body: { number, count },
  }, token)
}

// ─── Contatos ─────────────────────────────────────────────────

export async function listContacts(token, limit = 100, offset = 0) {
  return request('/contacts/list', {
    method: 'POST',
    body: { limit, offset, contactScope: 'all' },
  }, token)
}

export async function checkNumbers(token, numbers) {
  return request('/chat/check', { method: 'POST', body: { numbers } }, token)
}

export async function getChatDetails(token, number) {
  return request('/chat/details', { method: 'POST', body: { number } }, token)
}

// ─── Sender (Campanhas em massa) ──────────────────────────────

export async function createAdvancedCampaign(token, { info, delayMin, delayMax, messages, scheduledFor }) {
  return request('/sender/advanced', {
    method: 'POST',
    body: {
      info,
      delayMin: delayMin || 3,
      delayMax: delayMax || 8,
      scheduled_for: scheduledFor || 1,
      messages,
    },
  }, token)
}

export async function controlCampaign(token, folderId, action) {
  // action: stop | start | delete
  return request('/sender/edit', {
    method: 'POST',
    body: { folder_id: folderId, action },
  }, token)
}

export async function listCampaigns(token) {
  return request('/sender/listfolders', {}, token)
}

export async function listCampaignMessages(token, folderId, status, limit = 50, offset = 0) {
  return request('/sender/listmessages', {
    method: 'POST',
    body: { folder_id: folderId, messageStatus: status, limit, offset },
  }, token)
}
