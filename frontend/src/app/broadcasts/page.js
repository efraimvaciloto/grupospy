'use client'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { broadcasts as broadcastsApi, groups as groupsApi, numbers as numbersApi } from '../../lib/api'
import {
  Megaphone, Plus, Play, Square, FileText,
  Clock, CheckCircle, XCircle, AlertCircle, ChevronDown
} from 'lucide-react'

const STATUS_MAP = {
  draft:     { label: 'Rascunho',   cls: 'badge-neutral',  icon: FileText },
  scheduled: { label: 'Agendado',   cls: 'badge-info',     icon: Clock },
  sending:   { label: 'Enviando',   cls: 'badge-warning',  icon: Play },
  sent:      { label: 'Enviado',    cls: 'badge-success',  icon: CheckCircle },
  canceled:  { label: 'Cancelado',  cls: 'badge-neutral',  icon: XCircle },
  failed:    { label: 'Falhou',     cls: 'badge-danger',   icon: AlertCircle },
  paused:    { label: 'Pausado',    cls: 'badge-warning',  icon: Square },
}

function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] || STATUS_MAP.draft
  return <span className={`badge ${cls}`}>{label}</span>
}

function NewBroadcastModal({ onClose, onCreated }) {
  const [step, setStep]       = useState(1)
  const [numbers, setNumbers] = useState([])
  const [groups, setGroups]   = useState([])
  const [groupSearch, setGroupSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [form, setForm]       = useState({
    name: '', waNumberId: '', messageType: 'text',
    messageText: '', targetGroups: [], scheduledAt: '',
    delayMin: 3, delayMax: 8,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    numbersApi.list().then(r => setNumbers(Array.isArray(r) ? r : []))
  }, [])

  async function loadGroups(numberId) {
    if (!numberId) return
    const res = await groupsApi.list({ limit: 200 })
    setGroups(res.data || [])
  }

  function toggleGroup(id) {
    setForm(f => ({
      ...f,
      targetGroups: f.targetGroups.includes(id)
        ? f.targetGroups.filter(g => g !== id)
        : [...f.targetGroups, id],
    }))
  }

  async function save(send = false) {
    setSaving(true)
    try {
      const payload = {
        name:            form.name,
        waNumberId:      form.waNumberId,
        targetGroups:    form.targetGroups,
        scheduledAt:     form.scheduledAt || null,
        delayMin:        form.delayMin,
        delayMax:        form.delayMax,
        messagesPayload: [{
          type: form.messageType,
          text: form.messageText,
          number: '{{group_jid}}',
        }],
      }
      const broadcast = await broadcastsApi.create(payload)
      if (send) await broadcastsApi.send(broadcast.id)
      onCreated()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally { setSaving(false) }
  }

  const steps = ['Mensagem', 'Destino', 'Envio']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: 560, maxHeight: '88vh', overflow: 'auto', padding: 28, border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>Nova campanha</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Passo {step} de 3: {steps[step - 1]}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 10px' }}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => {
            const done = step > i + 1, active = step === i + 1
            return (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--color-success)' : active ? 'var(--color-accent-primary)' : 'var(--color-bg-elevated)', color: step >= i + 1 ? '#fff' : 'var(--color-text-muted)', border: active ? '2px solid var(--color-accent-primary)' : done ? '2px solid var(--color-success)' : '2px solid var(--color-border)', transition: 'all .2s' }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 2, marginLeft: 8, background: done ? 'var(--color-success)' : 'var(--color-border)', transition: 'background .2s' }} />}
            </div>
            )
          })}
        </div>

        {/* Step 1 - Mensagem */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Nome da campanha</label>
              <input className="input" placeholder="Ex: Aviso de Assembleia Janeiro"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Numero remetente</label>
              <select className="input" value={form.waNumberId}
                onChange={e => { setForm(f => ({ ...f, waNumberId: e.target.value })); loadGroups(e.target.value) }}>
                <option value="">Selecionar numero...</option>
                {numbers.filter(n => n.status === 'connected').map(n => (
                  <option key={n.id} value={n.id}>{n.label} — {n.phoneNumber || 'sem numero'}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Mensagem</label>
              <textarea id="broadcast-msg-textarea" className="input" rows={5}
                placeholder={'Ola {{nome_grupo}}!\n\nAqui vai seu comunicado...\n\nVariaveis: {{nome_grupo}}, {{data}}'}
                value={form.messageText}
                onChange={e => setForm(f => ({ ...f, messageText: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Variaveis disponiveis — clique para inserir:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { var: '{{nome_grupo}}', label: 'Nome do Grupo', desc: 'Nome do grupo destinatario' },
                    { var: '{{data}}', label: 'Data', desc: 'Data atual (dd/mm/aaaa)' },
                  ].map(v => (
                    <button key={v.var} type="button" title={v.desc}
                      onClick={() => {
                        const ta = document.getElementById('broadcast-msg-textarea')
                        if (ta) {
                          const s = ta.selectionStart, e = ta.selectionEnd
                          const newText = form.messageText.slice(0, s) + v.var + form.messageText.slice(e)
                          setForm(f => ({ ...f, messageText: newText }))
                          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.var.length }, 0)
                        } else { setForm(f => ({ ...f, messageText: f.messageText + v.var })) }
                      }}
                      style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{v.var}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Destino */}
        {step === 2 && (() => {
          const allTags = [...new Set(groups.flatMap(g => g.tags || []))]
          const filtered = groups.filter(g => {
            const matchSearch = !groupSearch || g.name?.toLowerCase().includes(groupSearch.toLowerCase())
            const matchTag = !tagFilter || g.tags?.includes(tagFilter)
            return matchSearch && matchTag
          })
          return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{form.targetGroups.length} grupos selecionados</label>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setForm(f => ({ ...f, targetGroups: f.targetGroups.length === filtered.length ? [] : filtered.map(g => g.id) }))}>
                {form.targetGroups.length === filtered.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="input"
                placeholder="Buscar grupo..."
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                style={{ fontSize: 12, padding: '6px 10px', flex: 1 }}
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              >
                <option value="">Todas as tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {tagFilter && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '4px 10px', marginBottom: 10, color: 'var(--color-accent-primary)' }}
                onClick={() => {
                  const tagGroupIds = filtered.map(g => g.id)
                  setForm(f => ({
                    ...f,
                    targetGroups: [...new Set([...f.targetGroups, ...tagGroupIds])],
                  }))
                }}
              >
                Selecionar todos com tag "{tagFilter}" ({filtered.length})
              </button>
            )}

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(g => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: form.targetGroups.includes(g.id) ? 'rgba(124,58,237,.08)' : 'var(--color-bg-elevated)', borderRadius: 8, cursor: 'pointer', border: form.targetGroups.includes(g.id) ? '1px solid var(--color-border-focus)' : '1px solid var(--color-border)', transition: 'all .15s' }}>
                  <input type="checkbox" checked={form.targetGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)} style={{ accentColor: 'var(--color-accent-primary)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{g.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{g.memberCount} membros</span>
                      {g.tags?.length > 0 && g.tags.slice(0, 2).map(t => (
                        <span key={t} className="badge badge-info" style={{ fontSize: 9 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 16 }}>
                  {groups.length === 0
                    ? 'Selecione um numero conectado no passo anterior para carregar os grupos.'
                    : 'Nenhum grupo encontrado para essa busca.'}
                </p>
              )}
            </div>
          </div>
          )
        })()}

        {/* Step 3 - Envio */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 10, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{form.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{form.targetGroups.length} grupos selecionados</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxHeight: 80, overflow: 'hidden', lineHeight: 1.5 }}>{form.messageText}</div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Agendar para (opcional)</label>
              <input className="input" type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Delay minimo (s)</label>
                <input className="input" type="number" min={1} value={form.delayMin} onChange={e => setForm(f => ({ ...f, delayMin: +e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Delay maximo (s)</label>
                <input className="input" type="number" min={1} value={form.delayMax} onChange={e => setForm(f => ({ ...f, delayMax: +e.target.value }))} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              O delay entre envios protege contra banimento. Recomendado: 3-10 segundos.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step < 3 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && (!form.name || !form.waNumberId || !form.messageText)}>
                Proximo
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => save(false)} disabled={saving}>
                  Salvar rascunho
                </button>
                <button className="btn btn-primary" onClick={() => save(true)} disabled={saving || form.targetGroups.length === 0}>
                  {saving ? 'Enviando...' : form.scheduledAt ? 'Agendar' : 'Enviar agora'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BroadcastCard({ broadcast, onRefresh }) {
  const [report, setReport] = useState(null)
  const [showReport, setShowReport] = useState(false)

  async function loadReport() {
    const r = await broadcastsApi.report(broadcast.id)
    setReport(r); setShowReport(true)
  }

  async function cancel() {
    if (!confirm('Cancelar esta campanha?')) return
    await broadcastsApi.cancel(broadcast.id)
    onRefresh()
  }

  async function send() {
    await broadcastsApi.send(broadcast.id)
    onRefresh()
  }

  const pct = broadcast.totalTargets > 0
    ? Math.round((broadcast.totalSent / broadcast.totalTargets) * 100) : 0

  return (
    <div className="card" style={{ border: '1px solid var(--color-border)', transition: 'border-color .2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}>{broadcast.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {broadcast.numberLabel} · {broadcast.totalTargets} grupos
          </div>
        </div>
        <StatusBadge status={broadcast.status} />
      </div>

      {/* Barra de progresso */}
      {broadcast.status === 'sending' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            <span>Enviados: {broadcast.totalSent}/{broadcast.totalTargets}</span>
            <span style={{ fontWeight: 600, color: 'var(--color-accent-primary)' }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--color-bg-elevated)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))', borderRadius: 99, transition: 'width .4s ease' }} />
          </div>
        </div>
      )}

      {broadcast.status === 'sent' && (
        <div style={{ display: 'flex', gap: 14, fontSize: 12, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-success)' }}><CheckCircle size={13} /> {broadcast.totalSent} enviados</span>
          {broadcast.totalFailed > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-danger)' }}><XCircle size={13} /> {broadcast.totalFailed} falhas</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {broadcast.status === 'draft' && (
          <button className="btn btn-primary" onClick={send} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Play size={13} /> Enviar</button>
        )}
        {['sending', 'scheduled'].includes(broadcast.status) && (
          <button className="btn btn-ghost" onClick={cancel} style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6 }}><Square size={13} /> Cancelar</button>
        )}
        {broadcast.status === 'sent' && (
          <button className="btn btn-ghost" onClick={loadReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={13} /> Relatorio</button>
        )}
      </div>

      {showReport && report && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Relatorio de entrega</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {report.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 8px', borderRadius: 6, background: 'var(--color-bg-elevated)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t.groupName || t.waGroupJid}</span>
                <span style={{ color: t.status === 'sent' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card" style={{ border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 12 }} />
      </div>
      <div className="skeleton" style={{ height: 5, borderRadius: 99, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 34, borderRadius: 8 }} />
    </div>
  )
}

export default function BroadcastsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const tenant = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_tenant') || '{}') : {}
  const hasBroadcasts = tenant?.features?.broadcasts !== false // default true if not set

  async function load() {
    try {
      const res = await broadcastsApi.list()
      setList(Array.isArray(res) ? res : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Feature gate
  if (!hasBroadcasts) {
    return (
      <AppLayout>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, marginBottom: 20,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Megaphone size={28} color="var(--color-accent-primary)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Disparos não disponíveis no seu plano
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            O recurso de disparos em massa está disponível a partir do plano Starter. Faça upgrade para enviar campanhas para seus grupos.
          </p>
          <a
            href="/billing/upgrade"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            Ver planos e fazer upgrade
          </a>
        </div>
      </AppLayout>
    )
  }

  const byStatus = (s) => list.filter(b => b.status === s)

  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Disparos</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Envie informativos para seus grupos</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Nova campanha
          </button>
        </div>

        {/* Stats rapidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Enviadas',  count: byStatus('sent').length,      color: 'var(--color-success)',    bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.2)' },
            { label: 'Enviando',  count: byStatus('sending').length,    color: 'var(--color-warning)',    bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)' },
            { label: 'Agendadas', count: byStatus('scheduled').length,  color: 'var(--color-info)',       bg: 'rgba(59,130,246,.08)',  border: 'rgba(59,130,246,.2)' },
            { label: 'Rascunhos', count: byStatus('draft').length,      color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)', border: 'var(--color-border)' },
          ].map(({ label, count, color, bg, border }) => (
            <div key={label} style={{ padding: '14px 18px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {list.map(b => <BroadcastCard key={b.id} broadcast={b} onRefresh={load} />)}
            {list.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 64 }}>
                <Megaphone size={48} style={{
                  color: 'var(--color-text-primary)', opacity: 0.2,
                  display: 'block', margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  Nenhuma campanha criada
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Crie sua primeira campanha de disparos para seus grupos.
                </p>
                <button className="btn btn-primary" onClick={() => setShowNew(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={13} /> Nova campanha
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && <NewBroadcastModal onClose={() => setShowNew(false)} onCreated={load} />}
    </AppLayout>
  )
}
