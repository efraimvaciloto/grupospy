'use client'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { broadcasts as broadcastsApi, groups as groupsApi, numbers as numbersApi } from '../../lib/api'
import {
  Megaphone, Plus, Play, Square, FileText,
  Clock, CheckCircle, XCircle, AlertCircle, ChevronDown
} from 'lucide-react'

const STATUS_MAP = {
  draft:     { label: 'Rascunho',   cls: 'badge-gray',   icon: FileText },
  scheduled: { label: 'Agendado',   cls: 'badge-blue',   icon: Clock },
  sending:   { label: 'Enviando',   cls: 'badge-yellow', icon: Play },
  sent:      { label: 'Enviado',    cls: 'badge-green',  icon: CheckCircle },
  canceled:  { label: 'Cancelado',  cls: 'badge-gray',   icon: XCircle },
  failed:    { label: 'Falhou',     cls: 'badge-red',    icon: AlertCircle },
  paused:    { label: 'Pausado',    cls: 'badge-yellow', icon: Square },
}

function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] || STATUS_MAP.draft
  return <span className={`badge ${cls}`}>{label}</span>
}

function NewBroadcastModal({ onClose, onCreated }) {
  const [step, setStep]       = useState(1) // 1=mensagem, 2=destino, 3=agendamento
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
          number: '{{group_jid}}',   // substituído no backend
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="card" style={{ width: 560, maxHeight: '85vh', overflow: 'auto', padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>Nova campanha</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 10px' }}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {['Mensagem', 'Destino', 'Envio'].map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step > i ? 'var(--brand)' : step === i + 1 ? 'var(--brand)' : 'var(--border)',
                  color: step >= i + 1 ? '#000' : 'var(--muted)',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: step === i + 1 ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Mensagem */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Nome da campanha
              </label>
              <input className="input" placeholder="Ex: Aviso de Assembleia Janeiro"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Número remetente
              </label>
              <select className="input" value={form.waNumberId}
                onChange={e => { setForm(f => ({ ...f, waNumberId: e.target.value })); loadGroups(e.target.value) }}>
                <option value="">Selecionar número...</option>
                {numbers.filter(n => n.status === 'connected').map(n => (
                  <option key={n.id} value={n.id}>{n.label} — {n.phoneNumber || 'sem número'}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Mensagem
              </label>
              <textarea id="broadcast-msg-textarea" className="input" rows={5}
                placeholder={'Olá {{nome_grupo}}! 📢\n\nAqui vai seu comunicado...\n\nVariáveis disponíveis: {{nome_grupo}}, {{data}}'}
                value={form.messageText}
                onChange={e => setForm(f => ({ ...f, messageText: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                  Variáveis disponíveis — clique para inserir:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { var: '{{nome_grupo}}', label: 'Nome do Grupo', desc: 'Nome do grupo destinatário' },
                    { var: '{{data}}', label: 'Data', desc: 'Data atual (dd/mm/aaaa)' },
                  ].map(v => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => {
                        const ta = document.getElementById('broadcast-msg-textarea')
                        if (ta) {
                          const start = ta.selectionStart
                          const end = ta.selectionEnd
                          const text = form.messageText
                          const newText = text.slice(0, start) + v.var + text.slice(end)
                          setForm(f => ({ ...f, messageText: newText }))
                          setTimeout(() => {
                            ta.focus()
                            ta.selectionStart = ta.selectionEnd = start + v.var.length
                          }, 0)
                        } else {
                          setForm(f => ({ ...f, messageText: f.messageText + v.var }))
                        }
                      }}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 6,
                        background: 'var(--hover)', border: '1px solid var(--border)',
                        color: 'var(--brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      title={v.desc}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{v.var}</span>
                      <span style={{ color: 'var(--muted)' }}>({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Destino */}
        {step === 2 && (() => {
          const allTags = [...new Set(groups.flatMap(g => g.tags || []))]
          const filtered = groups.filter(g => {
            const matchSearch = !groupSearch || g.name?.toLowerCase().includes(groupSearch.toLowerCase())
            const matchTag = !tagFilter || g.tags?.includes(tagFilter)
            return matchSearch && matchTag
          })
          return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Selecionar grupos ({form.targetGroups.length} selecionados)
              </label>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setForm(f => ({
                  ...f,
                  targetGroups: f.targetGroups.length === filtered.length ? [] : filtered.map(g => g.id),
                }))}>
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
                style={{ fontSize: 11, padding: '4px 10px', marginBottom: 10, color: 'var(--brand)' }}
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
                <label key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: form.targetGroups.includes(g.id) ? 'rgba(37,211,102,.08)' : 'var(--hover)',
                  borderRadius: 8, cursor: 'pointer',
                  border: form.targetGroups.includes(g.id) ? '1px solid rgba(37,211,102,.3)' : '1px solid transparent',
                }}>
                  <input type="checkbox" checked={form.targetGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)} style={{ accentColor: 'var(--brand)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.memberCount} membros</span>
                      {g.tags?.length > 0 && g.tags.slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--hover)', color: 'var(--brand)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13, padding: 16 }}>
                  {groups.length === 0
                    ? 'Selecione um número conectado no passo anterior para carregar os grupos.'
                    : 'Nenhum grupo encontrado para essa busca.'}
                </p>
              )}
            </div>
          </div>
          )
        })()}

        {/* Step 3 — Envio */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 16, background: 'var(--hover)', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 13 }}>
                <strong>{form.name}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {form.targetGroups.length} grupos selecionados
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', maxHeight: 80, overflow: 'hidden' }}>
                {form.messageText}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Agendar para (opcional — deixe em branco para enviar agora)
              </label>
              <input className="input" type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Delay mínimo (segundos)
                </label>
                <input className="input" type="number" min={1} value={form.delayMin}
                  onChange={e => setForm(f => ({ ...f, delayMin: +e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Delay máximo (segundos)
                </label>
                <input className="input" type="number" min={1} value={form.delayMax}
                  onChange={e => setForm(f => ({ ...f, delayMax: +e.target.value }))} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>
              O delay entre envios protege contra banimento. Recomendado: 3–10 segundos.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancelar' : '← Voltar'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step < 3 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && (!form.name || !form.waNumberId || !form.messageText)}>
                Próximo →
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => save(false)} disabled={saving}>
                  Salvar rascunho
                </button>
                <button className="btn btn-primary" onClick={() => save(true)} disabled={saving || form.targetGroups.length === 0}>
                  {saving ? 'Enviando...' : form.scheduledAt ? '📅 Agendar' : '🚀 Enviar agora'}
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
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{broadcast.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {broadcast.numberLabel} · {broadcast.totalTargets} grupos
          </div>
        </div>
        <StatusBadge status={broadcast.status} />
      </div>

      {/* Barra de progresso */}
      {broadcast.status === 'sending' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Enviados: {broadcast.totalSent}/{broadcast.totalTargets}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)', transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {broadcast.status === 'sent' && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          <span>✅ {broadcast.totalSent} enviados</span>
          {broadcast.totalFailed > 0 && <span style={{ color: 'var(--danger)' }}>❌ {broadcast.totalFailed} falhas</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {broadcast.status === 'draft' && (
          <button className="btn btn-primary" onClick={send} style={{ flex: 1 }}>
            <Play size={13} /> Enviar
          </button>
        )}
        {['sending', 'scheduled'].includes(broadcast.status) && (
          <button className="btn btn-ghost" onClick={cancel} style={{ color: 'var(--danger)' }}>
            <Square size={13} /> Cancelar
          </button>
        )}
        {broadcast.status === 'sent' && (
          <button className="btn btn-ghost" onClick={loadReport}>
            <FileText size={13} /> Relatório
          </button>
        )}
      </div>

      {/* Mini relatório */}
      {showReport && report && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Relatório de entrega</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {report.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0' }}>
                <span style={{ color: 'var(--muted)' }}>{t.groupName || t.waGroupJid}</span>
                <span style={{ color: t.status === 'sent' ? 'var(--brand)' : 'var(--danger)' }}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BroadcastsPage() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    try {
      const res = await broadcastsApi.list()
      setList(Array.isArray(res) ? res : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const byStatus = (s) => list.filter(b => b.status === s)

  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>Disparos</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Envie informativos para seus grupos</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nova campanha
          </button>
        </div>

        {/* Stats rápidos */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Enviadas', count: byStatus('sent').length,      color: 'var(--brand)' },
            { label: 'Enviando', count: byStatus('sending').length,    color: 'var(--warning)' },
            { label: 'Agendadas', count: byStatus('scheduled').length, color: 'var(--info)' },
            { label: 'Rascunhos', count: byStatus('draft').length,     color: 'var(--muted)' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{
              flex: 1, padding: '12px 16px', background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 22, fontFamily: 'Syne', fontWeight: 800, color }}>{count}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {list.map(b => <BroadcastCard key={b.id} broadcast={b} onRefresh={load} />)}
            {list.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 14, padding: 24 }}>
                Nenhuma campanha criada. Clique em "Nova campanha" para começar.
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && <NewBroadcastModal onClose={() => setShowNew(false)} onCreated={load} />}
    </AppLayout>
  )
}
