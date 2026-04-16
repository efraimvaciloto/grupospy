'use client'
import { useEffect, useState, useRef } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { contacts as contactsApi, numbers as numbersApi } from '../../lib/api'
import { Users, Plus, Upload, Search, CheckCircle, XCircle, Trash2, Edit2, Shield, Download } from 'lucide-react'

function ImportModal({ onClose, onImported }) {
  const [raw, setRaw]     = useState('')
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(Boolean)
    const header = lines[0].toLowerCase().split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const obj = {}
      header.forEach((h, i) => { obj[h] = cols[i] || '' })
      return {
        name:        obj.nome || obj.name || obj.contato || cols[0] || '',
        phoneNumber: (obj.telefone || obj.phone || obj.celular || obj.whatsapp || cols[1] || '')
          .replace(/[^0-9]/g, ''),
        email: obj.email || '',
        tags:  obj.tags ? obj.tags.split(';').map(t => t.trim()) : [],
      }
    }).filter(c => c.phoneNumber)
  }

  function handleTextChange(text) {
    setRaw(text)
    try { setPreview(parseCSV(text).slice(0, 5)) } catch { setPreview([]) }
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleTextChange(ev.target.result)
    reader.readAsText(file, 'utf-8')
  }

  async function doImport() {
    setLoading(true)
    try {
      const contacts = parseCSV(raw)
      const res = await contactsApi.import({ contacts })
      alert(`${res.imported} contatos importados!`)
      onImported(); onClose()
    } catch (err) {
      alert(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div className="card" style={{ width: 520, padding: 28, border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>Importar contatos</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Formato CSV</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 10px', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{
          padding: '10px 14px', background: 'var(--color-bg-elevated)',
          borderRadius: 8, marginBottom: 14, border: '1px solid var(--color-border)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
            Colunas aceitas:{' '}
            <code style={{
              background: 'var(--color-bg-primary)', padding: '2px 6px',
              borderRadius: 4, color: 'var(--color-accent-primary)', fontSize: 11,
            }}>
              nome, telefone, email, tags
            </code>
            <br />
            <span style={{ marginTop: 4, display: 'block' }}>Tags separadas por ponto-e-vírgula. Telefone: somente números.</span>
          </p>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={() => document.getElementById('csvFile').click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Upload size={13} /> Selecionar arquivo CSV
          </button>
          <input id="csvFile" type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        </label>

        <textarea className="input" rows={6}
          placeholder={'nome,telefone,email,tags\nJoão Silva,5511999998888,joao@email.com,vip;ativo\nMaria Costa,5521888887777,,cliente'}
          value={raw} onChange={e => handleTextChange(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, width: '100%' }}
        />

        {preview.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Previa ({preview.length} primeiros):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {preview.map((c, i) => (
                <div key={i} style={{
                  fontSize: 12, padding: '6px 10px',
                  background: 'var(--color-bg-elevated)', borderRadius: 6,
                  display: 'flex', gap: 12, border: '1px solid var(--color-border)',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{c.phoneNumber}</span>
                  {c.email && <span style={{ color: 'var(--color-text-muted)' }}>{c.email}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={doImport}
            disabled={loading || !raw.trim()} style={{ flex: 1 }}>
            {loading ? 'Importando...' : `Importar ${raw ? parseCSV(raw).length : 0} contatos`}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContactRow({ contact, onDelete, onEdit, onToggleTeam }) {
  const initials = contact.name ? contact.name[0].toUpperCase() : '?'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
      transition: 'background 0.15s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-accent-glow)',
        border: '1px solid var(--color-accent-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'var(--color-accent-primary)',
      }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{contact.name}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{contact.phoneNumber}</div>
      </div>

      {contact.email && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-secondary)',
          width: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {contact.email}
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: 150 }}>
        {(contact.tags || []).slice(0, 3).map(t => (
          <span key={t} className="badge badge-info" style={{ fontSize: 10 }}>{t}</span>
        ))}
      </div>

      {/* WA status */}
      <div style={{ width: 80, textAlign: 'center' }}>
        {contact.waValid === true  && <span className="badge badge-success" style={{ fontSize: 10 }}>WA</span>}
        {contact.waValid === false && <span className="badge badge-neutral" style={{ fontSize: 10 }}>Sem WA</span>}
        {contact.waValid == null   && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>}
      </div>

      {/* Equipe */}
      <div style={{ width: 70, textAlign: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleTeam(contact) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px',
            borderRadius: 999, fontSize: 10, fontWeight: 600,
            color: contact.isTeamMember ? 'var(--color-success)' : 'var(--color-text-muted)',
            backgroundColor: contact.isTeamMember ? 'rgba(16,185,129,.12)' : 'var(--color-bg-elevated)',
            transition: 'all .15s',
          }}
          title={contact.isTeamMember ? 'Membro da equipe' : 'Marcar como equipe'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={10} />
            {contact.isTeamMember ? 'Equipe' : '—'}
          </span>
        </button>
      </div>

      {/* Acoes */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-ghost" onClick={() => onEdit(contact)}
          style={{ padding: '5px 8px', borderRadius: 6 }}>
          <Edit2 size={13} />
        </button>
        <button className="btn btn-ghost" onClick={() => onDelete(contact.id)}
          style={{ padding: '5px 8px', borderRadius: 6, color: 'var(--color-danger)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 13, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '25%', borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: 120, height: 13, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 12 }} />
      <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 12 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [list, setList]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ name: '', phoneNumber: '', email: '', tags: '', isTeamMember: false })
  const [numbers, setNumbers]   = useState([])
  const [validating, setValidating] = useState(false)
  const [selected, setSelected] = useState([])
  const [filterTeam, setFilterTeam] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await contactsApi.list({ search, page, limit: 50 })
      setList(res.data || [])
      setTotal(res.meta?.total || 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  useEffect(() => {
    numbersApi.list().then(r => setNumbers(Array.isArray(r) ? r.filter(n => n.status === 'connected') : []))
  }, [])

  function exportAllCSV() {
    const header = 'nome,telefone,email,tags,equipe,whatsapp_validado'
    const rows = list.map(c => {
      const name = (c.name || '').replace(/,/g, ' ')
      const phone = c.phoneNumber || ''
      const email = c.email || ''
      const tags = (c.tags || []).join(';')
      const team = c.isTeamMember ? 'sim' : 'nao'
      const wa = c.waValid === true ? 'sim' : c.waValid === false ? 'nao' : 'desconhecido'
      return `${name},${phone},${email},${tags},${team},${wa}`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contatos_grupodozap_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openNew() { setEditing(null); setForm({ name: '', phoneNumber: '', email: '', tags: '', isTeamMember: false }); setShowForm(true) }
  function openEdit(c) { setEditing(c); setForm({ name: c.name, phoneNumber: c.phoneNumber, email: c.email || '', tags: (c.tags || []).join(', '), isTeamMember: !!c.isTeamMember }); setShowForm(true) }

  async function toggleTeam(contact) {
    try {
      await contactsApi.update(contact.id, { is_team_member: !contact.isTeamMember })
      load()
    } catch (err) { alert(err.message) }
  }

  async function save() {
    const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [], is_team_member: form.isTeamMember }
    delete payload.isTeamMember
    try {
      if (editing) await contactsApi.update(editing.id, payload)
      else         await contactsApi.create(payload)
      setShowForm(false); load()
    } catch (err) { alert(err.message) }
  }

  async function remove(id) {
    if (!confirm('Remover contato?')) return
    await contactsApi.remove(id); load()
  }

  async function validateSelected() {
    if (selected.length === 0) return alert('Selecione contatos para validar.')
    if (numbers.length === 0)  return alert('Voce precisa de um numero conectado para validar.')
    setValidating(true)
    try {
      const phones = list.filter(c => selected.includes(c.id)).map(c => c.phoneNumber)
      await contactsApi.validate({ waNumberId: numbers[0].id, phoneNumbers: phones })
      alert('Validacao concluida!')
      load(); setSelected([])
    } catch (err) { alert(err.message) }
    finally { setValidating(false) }
  }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const displayList = filterTeam ? list.filter(c => c.isTeamMember) : list

  return (
    <AppLayout>
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Contatos</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              {loading ? 'Carregando...' : `${total} contatos cadastrados`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected.length > 0 && (
              <button className="btn btn-ghost" onClick={validateSelected} disabled={validating} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} /> {validating ? 'Validando...' : `Validar WhatsApp (${selected.length})`}
              </button>
            )}
            <button className="btn btn-ghost" onClick={exportAllCSV} disabled={list.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={13} /> Exportar CSV
            </button>
            <button className="btn btn-ghost" onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Importar CSV
            </button>
            <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Novo contato
            </button>
          </div>
        </div>

        {/* Busca + Filtro */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 360, flex: 1 }}>
            <Search size={13} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }} />
            <input className="input" style={{ paddingLeft: 34 }} placeholder="Buscar por nome ou telefone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button
            className={`btn ${filterTeam ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterTeam(f => f ? null : true)}
            style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Filtrar apenas membros da equipe"
          >
            <Users size={13} /> Equipe
          </button>
        </div>

        {/* Tabela */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          {/* Header da tabela */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--color-bg-elevated)' }}>
            <input type="checkbox" style={{ accentColor: 'var(--color-accent-primary)' }}
              checked={selected.length === list.length && list.length > 0}
              onChange={() => setSelected(selected.length === list.length ? [] : list.map(c => c.id))} />
            <div style={{ flex: 1 }}>Nome</div>
            <div style={{ width: 180 }}>Email</div>
            <div style={{ width: 150 }}>Tags</div>
            <div style={{ width: 80, textAlign: 'center' }}>WhatsApp</div>
            <div style={{ width: 70, textAlign: 'center' }}>Equipe</div>
            <div style={{ width: 64 }}>Acoes</div>
          </div>

          {loading ? (
            <>
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </>
          ) : (
            displayList.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ paddingLeft: 16 }}>
                  <input type="checkbox" style={{ accentColor: 'var(--color-accent-primary)' }}
                    checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                </div>
                <div style={{ flex: 1 }}>
                  <ContactRow contact={c} onDelete={remove} onEdit={openEdit} onToggleTeam={toggleTeam} />
                </div>
              </div>
            ))
          )}

          {!loading && displayList.length === 0 && (
            <div style={{ padding: 56, textAlign: 'center' }}>
              <Users size={48} style={{ color: 'var(--color-text-primary)', opacity: 0.2, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>Nenhum contato encontrado</div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                {search ? 'Tente ajustar sua busca.' : 'Adicione seu primeiro contato agora.'}
              </p>
              <button className="btn btn-primary" onClick={openNew}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} /> Adicionar contato
              </button>
            </div>
          )}
        </div>

        {/* Paginacao */}
        {total > 50 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              Pagina {page} de {Math.ceil(total / 50)}
            </span>
            <button className="btn btn-ghost" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Proxima</button>
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}>
          <div className="card" style={{ width: 420, padding: 28, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {editing ? 'Editar contato' : 'Novo contato'}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {editing ? 'Atualize as informacoes do contato' : 'Preencha os dados do novo contato'}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ padding: '6px 10px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Nome *',    'name',        'text',  'Joao Silva'],
                ['Telefone *','phoneNumber', 'text',  '5511999998888'],
                ['Email',     'email',       'email', 'joao@email.com'],
                ['Tags',      'tags',        'text',  'vip, cliente, ativo'],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="input" type={type} placeholder={ph}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: -6 }}>Separe tags por virgula.</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--color-accent-primary)' }}
                  checked={form.isTeamMember} onChange={e => setForm(f => ({ ...f, isTeamMember: e.target.checked }))} />
                Membro da equipe
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} style={{ flex: 1 }}>
                {editing ? 'Salvar alteracoes' : 'Criar contato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={load} />}
    </AppLayout>
  )
}

