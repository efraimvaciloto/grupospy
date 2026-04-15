const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gs_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  if (options.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('gs_token')
    window.location.href = '/auth/login'
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────
export const auth = {
  login:    (body) => request('/auth/login',    { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  refresh:  (body) => request('/auth/refresh',  { method: 'POST', body }),
}

// ─── Numbers ──────────────────────────────────────────────────
export const numbers = {
  list:         ()     => request('/numbers'),
  create:       (body) => request('/numbers', { method: 'POST', body }),
  getQR:        (id)   => request(`/numbers/${id}/qr`),
  connect:      (id, body) => request(`/numbers/${id}/connect`,    { method: 'POST', body }),
  disconnect:   (id)   => request(`/numbers/${id}/disconnect`,   { method: 'POST' }),
  reconnect:    (id)   => request(`/numbers/${id}/reconnect`,    { method: 'POST' }),
  remove:       (id)   => request(`/numbers/${id}`,              { method: 'DELETE' }),
  syncGroups:   (id, force) => request(`/numbers/${id}/sync-groups`, { method: 'POST', body: { force } }),
  syncContacts: (id) => request(`/numbers/${id}/sync-contacts`, { method: 'POST' }),
}

// ─── Groups ───────────────────────────────────────────────────
export const groups = {
  list:        (params = {}) => request('/groups?' + new URLSearchParams(params)),
  get:         (id)          => request(`/groups/${id}`),
  update:      (id, body)    => request(`/groups/${id}`, { method: 'PATCH', body }),
  create:      (body)        => request('/groups/create', { method: 'POST', body }),
  info:        (id)          => request(`/groups/${id}/info`),
  members:     (id)          => request(`/groups/${id}/members`),
  addMembers:  (id, body)    => request(`/groups/${id}/members`, { method: 'POST', body }),
  messages:    (id, params)  => request(`/groups/${id}/messages?` + new URLSearchParams(params || {})),
  sendMessage: (id, body)    => request(`/groups/${id}/messages`, { method: 'POST', body }),
  alerts:      (id)          => request(`/groups/${id}/alerts`),
  resolveAlert:(id, alertId) => request(`/groups/${id}/alerts/${alertId}/resolve`, { method: 'PATCH' }),
  summary:     (id, params)  => request(`/groups/${id}/summary?` + new URLSearchParams(params || {})),
  generateSummary: (id, body) => request(`/groups/${id}/summary/generate`, { method: 'POST', body }),
  updateName:  (id, body)    => request(`/groups/${id}/name`, { method: 'PATCH', body }),
  updateDesc:  (id, body)    => request(`/groups/${id}/description`, { method: 'PATCH', body }),
  updateImage: (id, body)    => request(`/groups/${id}/image`, { method: 'PATCH', body }),
  updateSettings: (id, body) => request(`/groups/${id}/settings`, { method: 'PATCH', body }),
  leave:       (id)          => request(`/groups/${id}/leave`, { method: 'POST' }),
}

// ─── Analytics ────────────────────────────────────────────────
export const analytics = {
  dashboard:  ()            => request('/analytics/dashboard'),
  heat:       (id, params)  => request(`/analytics/groups/${id}/heat?` + new URLSearchParams(params || {})),
  sentiment:  (id, params)  => request(`/analytics/groups/${id}/sentiment?` + new URLSearchParams(params || {})),
  tasks:      (params)      => request('/tasks?' + new URLSearchParams(params || {})),
  updateTask: (id, body)    => request(`/tasks/${id}`, { method: 'PATCH', body }),
  createTask: (body)        => request('/tasks', { method: 'POST', body }),
}

// ─── Broadcasts ───────────────────────────────────────────────
export const broadcasts = {
  list:    ()     => request('/broadcasts'),
  create:  (body) => request('/broadcasts', { method: 'POST', body }),
  send:    (id)   => request(`/broadcasts/${id}/send`, { method: 'POST' }),
  cancel:  (id)   => request(`/broadcasts/${id}/cancel`, { method: 'POST' }),
  report:  (id)   => request(`/broadcasts/${id}/report`),
}

// ─── Contacts ─────────────────────────────────────────────────
export const contacts = {
  list:     (params) => request('/contacts?' + new URLSearchParams(params || {})),
  create:   (body)   => request('/contacts', { method: 'POST', body }),
  update:   (id, body) => request(`/contacts/${id}`, { method: 'PATCH', body }),
  remove:   (id)     => request(`/contacts/${id}`, { method: 'DELETE' }),
  import:   (body)   => request('/contacts/import', { method: 'POST', body }),
  validate: (body)   => request('/contacts/validate', { method: 'POST', body }),
}
