'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { groups as groupsApi, numbers as numbersApi, contacts as contactsApi } from '../../lib/api'
import { useRealtime } from '../../hooks/useRealtime'
import GroupInfoSidebar from '../../components/GroupInfoSidebar'
import {
  Search, Send, Bot, ChevronRight, AlertCircle,
  Users, RefreshCw, Flame, MessageSquare, Plus, X
} from 'lucide-react'

function HeatDot({ score }) {
  const color = score >= 81 ? '#f97316' : score >= 61 ? '#ef4444'
    : score >= 31 ? '#f59e0b' : '#64748b'
  return <span style={{
    width: 8, height: 8, borderRadius: '50%',
    background: color, display: 'inline-block', flexShrink: 0,
  }} />
}

function GroupItem({ group, selected, onSelect }) {
  const lastMsg = group.lastMessageAt
    ? new Date(group.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div
      onClick={() => onSelect(group)}
      style={{
        padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
        background: selected ? 'var(--hover)' : 'transparent',
        display: 'flex', gap: 10, alignItems: 'center',
        transition: 'background .1s',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, position: 'relative' }}>
        {group.avatarUrl && (
          <img
            src={group.avatarUrl}
            alt=""
            style={{
              width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
              position: 'absolute', top: 0, left: 0,
            }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'var(--muted)',
        }}>
          {group.name[0]?.toUpperCase()}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, truncate: true }}>{group.name}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{lastMsg}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
          <HeatDot score={group.heatScore || 0} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {group.memberCount} membros
          </span>
          {group.unresolvedAlerts > 0 && (
            <span className="badge badge-red" style={{ padding: '0 6px', fontSize: 10 }}>
              {group.unresolvedAlerts} alertas
            </span>
          )}
        </div>
        {group.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
            {group.tags.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--hover)', color: 'var(--brand)' }}>{t}</span>
            ))}
            {group.tags.length > 2 && <span style={{ fontSize: 9, color: 'var(--muted)' }}>+{group.tags.length - 2}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function MediaContent({ msg }) {
  const type = (msg.messageType || '').toLowerCase()
  const url = msg.fileUrl

  if (!url) {
    if (type.includes('image')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Imagem</div>
    if (type.includes('video') || type.includes('ptv')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Video</div>
    if (type.includes('audio')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Audio</div>
    if (type.includes('sticker')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Figurinha</div>
    if (type.includes('document')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Documento</div>
    if (type.includes('contact')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Contato</div>
    if (type.includes('poll')) return <div style={{ padding: '8px 0', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Enquete</div>
    return null
  }

  if (type.includes('image') || type.includes('sticker')) {
    return <img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 4 }} onError={e => { e.target.style.display = 'none' }} />
  }
  if (type.includes('video') || type.includes('ptv')) {
    return <video src={url} controls style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 4 }} />
  }
  if (type.includes('audio')) {
    return <audio src={url} controls style={{ width: '100%', marginBottom: 4 }} />
  }
  if (type.includes('document')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--brand)', fontSize: 12, textDecoration: 'none' }}>
        Abrir documento
      </a>
    )
  }
  return null
}

function ChatMessage({ msg }) {
  const isMe = msg.isFromMe || msg.wasSentByApi
  const time  = new Date(msg.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const type  = (msg.messageType || '').toLowerCase()
  const isText = type === 'conversation' || type === 'extendedtextmessage'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isMe && (
        <span style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 3, marginLeft: 4 }}>
          {msg.senderName || msg.senderPhone}
        </span>
      )}
      <div style={{
        maxWidth: '70%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isMe ? 'var(--brand-dim)' : 'var(--card)',
        border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.5,
      }}>
        {!isText && <MediaContent msg={msg} />}
        {msg.body && <div>{msg.body}</div>}
        {!msg.body && isText && <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>mensagem vazia</span>}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textAlign: 'right', marginTop: 4 }}>
          {time}
        </div>
      </div>
    </div>
  )
}

function AISummary({ groupId }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const s = await groupsApi.summary(groupId, { date: today })
      setSummary(s)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const s = await groupsApi.generateSummary(groupId, {})
      setSummary(s)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { if (groupId) load() }, [groupId])

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Carregando resumo...</div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={14} color="var(--brand)" /> Resumo IA — Hoje
        </h4>
        <button className="btn btn-ghost" onClick={generate} style={{ padding: '4px 10px', fontSize: 11 }}>
          <RefreshCw size={11} /> Gerar
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
          color: '#ef4444', fontSize: 12, lineHeight: 1.5,
        }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {summary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>{summary.summaryText}</p>

          {summary.topics?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Tópicos</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {summary.topics.map(t => (
                  <span key={t} className="badge badge-blue">{t}</span>
                ))}
              </div>
            </div>
          )}

          {summary.tasks?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Tarefas identificadas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.tasks.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: '8px 10px', background: 'var(--hover)', borderRadius: 8,
                  }}>
                    <AlertCircle size={13} color={t.urgency === 'high' ? 'var(--danger)' : 'var(--warning)'} style={{ marginTop: 1 }} />
                    <span style={{ fontSize: 12 }}>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span>🌡 Heat: <strong>{summary.heatScore}</strong></span>
            <span>😊 {summary.sentiment === 'positive' ? 'Positivo' : summary.sentiment === 'negative' ? 'Negativo' : 'Neutro'}</span>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Nenhum resumo gerado ainda. Clique em "Gerar" para analisar as mensagens de hoje.
        </p>
      )}
    </div>
  )
}

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [numbersList, setNumbersList] = useState([])
  const [contactsList, setContactsList] = useState([])
  const [selectedNumber, setSelectedNumber] = useState('')
  const [selectedContacts, setSelectedContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    numbersApi.list().then(nums => {
      const connected = (nums || []).filter(n => n.status === 'connected')
      setNumbersList(connected)
      if (connected.length > 0) setSelectedNumber(connected[0].id)
    })
    contactsApi.list({ limit: 200 }).then(res => setContactsList(res.data || []))
  }, [])

  const filteredContacts = contactsList.filter(c =>
    !contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phoneNumber?.includes(contactSearch)
  )

  function toggleContact(contact) {
    setSelectedContacts(prev => {
      const exists = prev.find(c => c.id === contact.id)
      return exists ? prev.filter(c => c.id !== contact.id) : [...prev, contact]
    })
  }

  async function handleCreate() {
    if (!name.trim() || !selectedNumber) return
    setLoading(true)
    try {
      const participants = selectedContacts.map(c => c.phoneNumber + '@s.whatsapp.net')
      await groupsApi.create({ waNumberId: selectedNumber, name, participants })
      onCreated()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }} onClick={onClose}>
      <div style={{
        width: 520, background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', padding: 28,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Criar Grupo</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Nome do grupo */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
            Nome do grupo
          </label>
          <input
            className="input"
            placeholder="Ex: Equipe Marketing"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Numero remetente */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
            Numero remetente
          </label>
          <select
            className="input"
            value={selectedNumber}
            onChange={e => setSelectedNumber(e.target.value)}
            style={{ fontSize: 13 }}
          >
            {numbersList.length === 0 && <option value="">Nenhum numero conectado</option>}
            {numbersList.map(n => (
              <option key={n.id} value={n.id}>
                {n.label || n.phone || n.id}
              </option>
            ))}
          </select>
        </div>

        {/* Contatos */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
            Participantes {selectedContacts.length > 0 && `(${selectedContacts.length} selecionados)`}
          </label>
          <input
            className="input"
            placeholder="Buscar contato..."
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          <div style={{
            maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border)',
            borderRadius: 8, background: 'var(--card)',
          }}>
            {filteredContacts.length === 0 && (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                Nenhum contato encontrado
              </div>
            )}
            {filteredContacts.map(c => {
              const checked = selectedContacts.some(sc => sc.id === c.id)
              return (
                <div
                  key={c.id}
                  onClick={() => toggleContact(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: checked ? 'var(--hover)' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={checked} readOnly style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name || 'Sem nome'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.phoneNumber}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            style={{ fontSize: 13 }}
          >
            {loading ? 'Criando...' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const [groupList, setGroupList]   = useState([])
  const [selected, setSelected]     = useState(null)
  const [messages, setMessages]     = useState([])
  const [search, setSearch]         = useState('')
  const [sendText, setSendText]     = useState('')
  const [tab, setTab]               = useState('chat') // chat | summary
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const messagesEndRef              = useRef(null)

  const tenant = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_tenant') || '{}') : {}

  async function loadGroups() {
    try {
      const res = await groupsApi.list({ search, limit: 100 })
      setGroupList(res.data || [])
    } catch {}
  }

  async function loadMessages(groupId) {
    try {
      const res = await groupsApi.messages(groupId, { limit: 50 })
      setMessages(res.data || [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {}
  }

  useEffect(() => { loadGroups() }, [search])

  async function selectGroup(group) {
    setSelected(group)
    setMessages([])
    await loadMessages(group.id)
  }

  async function sendMessage() {
    if (!sendText.trim() || !selected) return
    try {
      await groupsApi.sendMessage(selected.id, { type: 'text', text: sendText })
      setSendText('')
      await loadMessages(selected.id)
    } catch {}
  }

  // Tempo real
  useRealtime(tenant?.id, {
    'group:message': (event) => {
      if (event.groupId === selected?.id) {
        setMessages(prev => [...prev, event.message])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      loadGroups()
    },
    'group:updated': () => loadGroups(),
    'group:alert': () => loadGroups(),
  })

  return (
    <AppLayout>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Lista de grupos */}
        <div style={{
          width: 280, borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0,
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 30, fontSize: 12 }}
                  placeholder="Buscar grupo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateGroup(true)}
                style={{ padding: '7px 8px', flexShrink: 0 }}
                title="Criar grupo"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {groupList.map(g => (
              <GroupItem
                key={g.id} group={g}
                selected={selected?.id === g.id}
                onSelect={selectGroup}
              />
            ))}
            {groupList.length === 0 && (
              <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Nenhum grupo encontrado
              </div>
            )}
          </div>
        </div>

        {/* Área principal */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Header do grupo */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
                {selected.avatarUrl && (
                  <img
                    src={selected.avatarUrl}
                    alt=""
                    style={{
                      width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
                      position: 'absolute', top: 0, left: 0,
                    }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', background: 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'var(--muted)',
                }}>
                  {selected.name[0]}
                </div>
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setShowGroupInfo(true)}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Users size={11} /> {selected.memberCount} membros
                </div>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {['chat', 'summary'].map(t => (
                  <button
                    key={t}
                    className="btn btn-ghost"
                    onClick={() => setTab(t)}
                    style={{
                      padding: '5px 12px', fontSize: 12,
                      background: tab === t ? 'var(--hover)' : 'transparent',
                      color: tab === t ? 'var(--text)' : 'var(--muted)',
                    }}
                  >
                    {t === 'chat' ? <><MessageSquare size={11} /> Chat</> : <><Bot size={11} /> IA</>}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'chat' ? (
              <>
                {/* Mensagens */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  {messages.map(m => <ChatMessage key={m.id} msg={m} />)}
                  <div ref={messagesEndRef} />
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 60, fontSize: 13 }}>
                      Nenhuma mensagem carregada
                    </div>
                  )}
                </div>

                {/* Input de envio */}
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 10, background: 'var(--surface)',
                }}>
                  <input
                    className="input"
                    placeholder="Escrever mensagem..."
                    value={sendText}
                    onChange={e => setSendText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <button className="btn btn-primary" onClick={sendMessage} style={{ padding: '8px 14px' }}>
                    <Send size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <AISummary groupId={selected.id} />
              </div>
            )}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: 'var(--muted)',
          }}>
            <MessageSquare size={48} opacity={0.2} />
            <p style={{ fontSize: 14 }}>Selecione um grupo para começar</p>
          </div>
        )}

        {showGroupInfo && selected && (
          <GroupInfoSidebar
            group={selected}
            onClose={() => setShowGroupInfo(false)}
            onUpdated={() => { loadGroups(); setShowGroupInfo(false) }}
          />
        )}
      </div>
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => { setShowCreateGroup(false); loadGroups() }}
        />
      )}
    </AppLayout>
  )
}
