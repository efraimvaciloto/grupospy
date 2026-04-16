'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { analytics, groups as groupsApi } from '../../lib/api'
import { CheckSquare, Plus, AlertCircle, Clock, Filter, X } from 'lucide-react'

const urgencyMap = {
  high:   { label: 'Alta',  borderColor: 'var(--color-danger)',  badgeCls: 'badge-danger' },
  medium: { label: 'Media', borderColor: 'var(--color-warning)', badgeCls: 'badge-warning' },
  low:    { label: 'Baixa', borderColor: 'var(--color-info)',    badgeCls: 'badge-info' },
}

const statusMap = {
  open: { label: 'Aberta',    badgeCls: 'badge-info' },
  done: { label: 'Concluida', badgeCls: 'badge-success' },
}

function SkeletonTaskRow() {
  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', border: '1px solid var(--color-border)',
      borderLeft: '3px solid var(--color-border)',
    }}>
      <div className="skeleton" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton" style={{ height: 20, width: 80, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 20, width: 60, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 20, width: 70, borderRadius: 12 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 70, height: 32, borderRadius: 8 }} />
    </div>
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

  return (
    <AppLayout>
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Tarefas</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
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

        {/* Filters bar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20,
          alignItems: 'center', flexWrap: 'wrap',
          padding: '12px 16px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
        }}>
          <Filter size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 2, fontWeight: 500 }}>Filtrar:</span>
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', minWidth: 120 }}>
            <option value="open">Abertas</option>
            <option value="done">Concluidas</option>
            <option value="all">Todas</option>
          </select>
          <select className="input" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', minWidth: 160 }}>
            <option value="">Todos os grupos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select className="input" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', minWidth: 140 }}>
            <option value="">Todas urgencias</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(4)].map((_, i) => <SkeletonTaskRow key={i} />)}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 64, border: '1px solid var(--color-border)' }}>
            <AlertCircle size={48} style={{
              color: 'var(--color-text-primary)', opacity: 0.2,
              display: 'block', margin: '0 auto 16px',
            }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              Nenhuma tarefa encontrada
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Crie uma nova tarefa para comecar a gerenciar seus grupos.
            </p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Nova Tarefa
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTasks.map(task => {
              const urg = urgencyMap[task.urgency] || urgencyMap.medium
              const st  = statusMap[task.status]   || statusMap.open
              const isDone = task.status === 'done'
              return (
                <div key={task.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderLeft: `3px solid ${urg.borderColor}`,
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${urg.borderColor}`,
                  transition: 'background .15s, border-color .15s',
                  opacity: isDone ? 0.65 : 1,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <CheckSquare size={18}
                    color={isDone ? 'var(--color-success)' : 'var(--color-text-muted)'}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 6,
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {task.group_name && (
                        <span className="badge badge-neutral" style={{
                          background: 'var(--color-accent-glow)',
                          color: 'var(--color-accent-primary)',
                          border: '1px solid rgba(124,58,237,.3)',
                          fontSize: 10,
                        }}>
                          {task.group_name}
                        </span>
                      )}
                      <span className={`badge ${urg.badgeCls}`} style={{ fontSize: 10 }}>{urg.label}</span>
                      <span className={`badge ${st.badgeCls}`} style={{ fontSize: 10 }}>{st.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} /> {fmtDate(task.created_at || task.createdAt)}
                      </span>
                    </div>
                  </div>
                  {task.status === 'open' && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => completeTask(task.id)}
                      style={{
                        fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 5,
                        border: '1px solid var(--color-border)',
                        transition: 'background .15s, border-color .15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(16,185,129,.1)'
                        e.currentTarget.style.borderColor = 'var(--color-success)'
                        e.currentTarget.style.color = 'var(--color-success)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = ''
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.color = ''
                      }}
                    >
                      <CheckSquare size={13} /> Concluir
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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ width: 440, maxWidth: '90vw', padding: 28, border: '1px solid var(--color-border)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>Nova Tarefa</h2>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Preencha os dados da tarefa</p>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: 6, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 6, display: 'block',
                }}>Grupo *</label>
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
                <label style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 6, display: 'block',
                }}>Titulo *</label>
                <input
                  className="input"
                  required
                  placeholder="Titulo da tarefa"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 6, display: 'block',
                }}>Descricao</label>
                <textarea
                  className="input"
                  placeholder="Descricao opcional"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 6, display: 'block',
                }}>Urgencia</label>
                <select
                  className="input"
                  value={form.urgency}
                  onChange={e => setForm({ ...form, urgency: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Salvando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
