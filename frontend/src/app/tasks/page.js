'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { analytics, groups as groupsApi } from '../../lib/api'
import { CheckSquare, Plus, AlertCircle, Clock, Filter, X } from 'lucide-react'

const urgencyMap = {
  high:   { label: 'Alta',  bg: 'rgba(239,68,68,.15)',  color: '#ef4444' },
  medium: { label: 'Média', bg: 'rgba(234,179,8,.15)',  color: '#eab308' },
  low:    { label: 'Baixa', bg: 'rgba(148,163,184,.15)', color: '#94a3b8' },
}

const statusMap = {
  open: { label: 'Aberta',    bg: 'rgba(59,130,246,.15)', color: '#3b82f6' },
  done: { label: 'Concluída', bg: 'rgba(34,197,94,.15)',  color: '#22c55e' },
}

function Badge({ bg, color, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, background: bg, color,
    }}>
      {children}
    </span>
  )
}

export default function TasksPage() {
  const [tasks, setTasks]         = useState([])
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatusFilter]   = useState('open')
  const [groupFilter, setGroupFilter]     = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ groupId: '', title: '', description: '', urgency: 'medium' })

  const loadTasks = useCallback(async () => {
    try {
      const params = {}
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter
      if (groupFilter) params.groupId = groupFilter
      const data = await analytics.tasks(params)
      setTasks(Array.isArray(data) ? data : data.tasks || [])
    } catch { setTasks([]) }
    setLoading(false)
  }, [statusFilter, groupFilter])

  const loadGroups = useCallback(async () => {
    try {
      const data = await groupsApi.list()
      setGroups(Array.isArray(data) ? data : data.groups || [])
    } catch { setGroups([]) }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])
  useEffect(() => { setLoading(true); loadTasks() }, [loadTasks])

  const completeTask = async (id) => {
    try {
      await analytics.updateTask(id, { status: 'done' })
      loadTasks()
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.groupId || !form.title) return
    setSaving(true)
    try {
      await analytics.createTask({
        groupId: form.groupId,
        title: form.title,
        description: form.description || undefined,
        urgency: form.urgency,
      })
      setShowModal(false)
      setForm({ groupId: '', title: '', description: '', urgency: 'medium' })
      loadTasks()
    } catch {}
    setSaving(false)
  }

  const filteredTasks = urgencyFilter
    ? tasks.filter(t => t.urgency === urgencyFilter)
    : tasks

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('pt-BR') } catch { return '-' }
  }

  if (loading) return (
    <AppLayout>
      <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando...</div>
    </AppLayout>
  )

  const selectStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text)',
    outline: 'none', cursor: 'pointer',
  }

  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>Tarefas</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Gerencie as tarefas dos seus grupos
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Nova Tarefa
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--muted)" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="open">Abertas</option>
            <option value="done">Concluídas</option>
            <option value="all">Todas</option>
          </select>
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} style={selectStyle}>
            <option value="">Todos os grupos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} style={selectStyle}>
            <option value="">Todas urgências</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        {/* Task list */}
        {filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <AlertCircle size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ fontSize: 14 }}>Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTasks.map(task => {
              const urg = urgencyMap[task.urgency] || urgencyMap.medium
              const st  = statusMap[task.status]   || statusMap.open
              return (
                <div key={task.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                }}>
                  <CheckSquare size={18} color={st.color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {task.group_name && (
                        <Badge bg="rgba(139,92,246,.15)" color="#8b5cf6">{task.group_name}</Badge>
                      )}
                      <Badge bg={urg.bg} color={urg.color}>{urg.label}</Badge>
                      <Badge bg={st.bg} color={st.color}>{st.label}</Badge>
                      <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} /> {fmtDate(task.created_at || task.createdAt)}
                      </span>
                    </div>
                  </div>
                  {task.status === 'open' && (
                    <button
                      className="btn"
                      onClick={() => completeTask(task.id)}
                      style={{ fontSize: 12, padding: '5px 12px', whiteSpace: 'nowrap' }}
                    >
                      Concluir
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ width: 440, maxWidth: '90vw', padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Nova Tarefa</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Grupo *</label>
                <select
                  className="input"
                  required
                  value={form.groupId}
                  onChange={e => setForm({ ...form, groupId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Título *</label>
                <input
                  className="input"
                  required
                  placeholder="Título da tarefa"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Descrição</label>
                <textarea
                  className="input"
                  placeholder="Descrição opcional"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Urgência</label>
                <select
                  className="input"
                  value={form.urgency}
                  onChange={e => setForm({ ...form, urgency: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 4 }}>
                {saving ? 'Salvando...' : 'Criar Tarefa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
