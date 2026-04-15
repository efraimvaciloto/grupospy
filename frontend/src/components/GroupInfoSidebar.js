'use client'
import { useEffect, useState, useCallback } from 'react'
import { groups as groupsApi } from '../lib/api'
import {
  X, Users, Link2, Shield, ShieldOff, Edit3, LogOut,
  Crown, UserPlus, UserMinus, Copy, Check, Lock, Unlock,
  Image, ChevronDown, ChevronUp, Download, Tag
} from 'lucide-react'

function SectionHeader({ title, icon: Icon, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', cursor: onToggle ? 'pointer' : 'default',
        borderBottom: '1px solid var(--border)', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
        {Icon && <Icon size={13} />} {title}
      </span>
      {onToggle && (open ? <ChevronUp size={13} color="var(--muted)" /> : <ChevronDown size={13} color="var(--muted)" />)}
    </div>
  )
}

function InlineEdit({ value, onSave, multiline }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  useEffect(() => { setDraft(value || '') }, [value])

  function commit() {
    setEditing(false)
    if (draft.trim() !== (value || '').trim()) onSave(draft.trim())
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 6, minHeight: 20 }}
      >
        <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1, wordBreak: 'break-word' }}>
          {value || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Nenhum</span>}
        </span>
        <Edit3 size={12} color="var(--muted)" style={{ flexShrink: 0, marginTop: 3 }} />
      </div>
    )
  }

  const inputProps = {
    className: 'input',
    value: draft,
    onChange: e => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) commit(); if (e.key === 'Escape') setEditing(false) },
    autoFocus: true,
    style: { fontSize: 13, width: '100%' },
  }

  return multiline
    ? <textarea {...inputProps} rows={3} style={{ ...inputProps.style, resize: 'vertical' }} />
    : <input {...inputProps} />
}

function MemberRow({ member, isAdmin, onAction }) {
  const displayName = member.contact_name || member.push_name || member.phone
  const showPushName = member.push_name && member.contact_name && member.push_name !== member.contact_name
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: 'var(--muted)', flexShrink: 0,
      }}>
        {(displayName || '?')[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
        {showPushName && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{member.push_name}</div>}
      </div>
      {member.is_admin && <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>Admin</span>}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-ghost" onClick={() => onAction(member, member.is_admin ? 'demote' : 'promote')} title={member.is_admin ? 'Remover admin' : 'Promover a admin'} style={{ padding: 4 }}>
            {member.is_admin ? <ShieldOff size={12} /> : <Crown size={12} />}
          </button>
          {!member.is_admin && (
            <button className="btn btn-ghost" onClick={() => onAction(member, 'remove')} title="Remover do grupo" style={{ padding: 4, color: 'var(--danger)' }}>
              <UserMinus size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function GroupInfoSidebar({ group, onClose, onUpdated }) {
  const [info, setInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(true)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [addPhone, setAddPhone] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [currentTags, setCurrentTags] = useState(group.tags || [])

  const isAdmin = info?.isAdmin || false

  function exportMembersCSV() {
    const header = 'nome,telefone,admin,pushname'
    const rows = members.map(m => {
      const name = (m.contact_name || m.push_name || m.phone || '').replace(/,/g, ' ')
      const phone = m.phone || ''
      const admin = m.is_admin ? 'sim' : 'nao'
      const push = (m.push_name || '').replace(/,/g, ' ')
      return `${name},${phone},${admin},${push}`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contatos_${group.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadInfo = useCallback(async () => {
    try {
      const [infoData, membersData] = await Promise.all([
        groupsApi.info(group.id),
        groupsApi.members(group.id),
      ])
      setInfo(infoData)
      setMembers(Array.isArray(membersData) ? membersData : membersData?.data || [])
    } catch (err) {
      console.error('Failed to load group info:', err)
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => { loadInfo() }, [loadInfo])
  useEffect(() => { setCurrentTags(group.tags || []) }, [group.id, group.tags])

  async function withLoading(fn) {
    setActionLoading(true)
    try { await fn() } catch (err) { alert(err.message) } finally { setActionLoading(false) }
  }

  const handleUpdateName = (name) => withLoading(async () => { await groupsApi.updateName(group.id, { name }); onUpdated() })
  const handleUpdateDesc = (description) => withLoading(async () => { await groupsApi.updateDesc(group.id, { description }); await loadInfo() })

  async function addTag() {
    const tag = newTag.trim()
    if (!tag || currentTags.includes(tag)) return
    const updated = [...currentTags, tag]
    setCurrentTags(updated)
    setNewTag('')
    try {
      await groupsApi.update(group.id, { tags: updated })
      onUpdated()
    } catch (err) {
      setCurrentTags(currentTags)
      alert(err.message)
    }
  }

  async function removeTag(tag) {
    const updated = currentTags.filter(t => t !== tag)
    setCurrentTags(updated)
    try {
      await groupsApi.update(group.id, { tags: updated })
      onUpdated()
    } catch (err) {
      setCurrentTags(currentTags)
      alert(err.message)
    }
  }

  function handleToggleSetting(key) {
    if (!info) return
    withLoading(async () => { await groupsApi.updateSettings(group.id, { [key]: !info[key] }); await loadInfo() })
  }

  function handleMemberAction(member, action) {
    const phone = member.phone || member.id
    if (action === 'remove' && !confirm(`Remover ${member.contact_name || phone} do grupo?`)) return
    withLoading(async () => { await groupsApi.addMembers(group.id, { participants: [phone], action }); await loadInfo() })
  }

  function handleAddMember() {
    if (!addPhone.trim()) return
    withLoading(async () => {
      const phone = addPhone.includes('@') ? addPhone : addPhone.replace(/\D/g, '') + '@s.whatsapp.net'
      await groupsApi.addMembers(group.id, { participants: [phone], action: 'add' })
      setAddPhone(''); setShowAddInput(false); await loadInfo()
    })
  }

  function handleLeave() { withLoading(async () => { await groupsApi.leave(group.id); onUpdated() }) }

  function copyLink() {
    if (!info?.inviteLink) return
    navigator.clipboard.writeText(info.inviteLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{
        width: 360, flexShrink: 0, borderLeft: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', fontSize: 13,
      }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{
      width: 360, flexShrink: 0, borderLeft: '1px solid var(--border)',
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
          {group.avatarUrl && (
            <img
              src={group.avatarUrl} alt=""
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'var(--muted)',
          }}>
            {group.name[0]?.toUpperCase()}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Users size={11} /> {info?.memberCount || group.memberCount || members.length} membros
            {isAdmin && <span className="badge badge-green" style={{ fontSize: 10, padding: '1px 6px' }}>Admin</span>}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Invite Link */}
        <SectionHeader title="Link de convite" icon={Link2} open={linkOpen} onToggle={() => setLinkOpen(!linkOpen)} />
        {linkOpen && (
          <div style={{ padding: '10px 16px' }}>
            {info?.inviteLink ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, fontSize: 11, padding: '6px 8px', borderRadius: 6,
                  background: 'var(--hover)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text)',
                }}>
                  {info.inviteLink}
                </code>
                <button className="btn btn-ghost" onClick={copyLink} style={{ padding: 4, flexShrink: 0 }}>
                  {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Link nao disponivel</span>
            )}
          </div>
        )}

        {/* Description */}
        <SectionHeader title="Descricao" icon={Edit3} />
        <div style={{ padding: '10px 16px' }}>
          {isAdmin ? (
            <InlineEdit value={info?.description} onSave={handleUpdateDesc} multiline />
          ) : (
            <span style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {info?.description || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Nenhuma descricao</span>}
            </span>
          )}
        </div>

        {/* Tags */}
        <SectionHeader title="Tags" icon={Tag} />
        <div style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(currentTags || []).map(t => (
              <span key={t} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'var(--hover)', color: 'var(--brand)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {t}
                {isAdmin && <X size={10} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} />}
              </span>
            ))}
            {currentTags.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Nenhuma tag</span>
            )}
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                placeholder="Nova tag..."
                style={{ fontSize: 12, flex: 1 }}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
              />
              <button className="btn btn-ghost" onClick={addTag} style={{ padding: '4px 10px', fontSize: 11 }}>+</button>
            </div>
          )}
        </div>

        {/* Group Name (admin) */}
        {isAdmin && (
          <>
            <SectionHeader title="Nome do grupo" icon={Edit3} />
            <div style={{ padding: '10px 16px' }}>
              <InlineEdit value={group.name} onSave={handleUpdateName} />
            </div>
          </>
        )}

        {/* Settings (admin) */}
        {isAdmin && (
          <>
            <SectionHeader title="Configuracoes" icon={Lock} />
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13 }}>Somente admins enviam</span>
                <input
                  type="checkbox"
                  checked={!!info?.announce}
                  onChange={() => handleToggleSetting('announce')}
                  disabled={actionLoading}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13 }}>Somente admins editam</span>
                <input
                  type="checkbox"
                  checked={!!info?.locked}
                  onChange={() => handleToggleSetting('locked')}
                  disabled={actionLoading}
                />
              </label>
            </div>
          </>
        )}

        {/* Members */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <SectionHeader
              title={`Participantes (${members.length})`}
              icon={Users}
              open={membersOpen}
              onToggle={() => setMembersOpen(!membersOpen)}
            />
          </div>
          {members.length > 0 && (
            <button className="btn btn-ghost" onClick={exportMembersCSV} title="Exportar CSV" style={{ padding: 4, marginRight: 12 }}>
              <Download size={13} />
            </button>
          )}
        </div>
        {membersOpen && (
          <div>
            {isAdmin && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                {showAddInput ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="input"
                      placeholder="5511999999999"
                      value={addPhone}
                      onChange={e => setAddPhone(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); if (e.key === 'Escape') setShowAddInput(false) }}
                      autoFocus
                      style={{ fontSize: 12, flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={handleAddMember} disabled={actionLoading} style={{ padding: '4px 10px', fontSize: 11 }}>
                      Adicionar
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowAddInput(false)} style={{ padding: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowAddInput(true)}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
                  >
                    <UserPlus size={13} /> Adicionar participante
                  </button>
                )}
              </div>
            )}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {members.map((m, i) => (
                <MemberRow key={m.id || m.phone || i} member={m} isAdmin={isAdmin} onAction={handleMemberAction} />
              ))}
              {members.length === 0 && (
                <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                  Nenhum participante encontrado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div style={{ padding: '16px', marginTop: 8, borderTop: '1px solid var(--border)' }}>
          {confirmLeave ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>Tem certeza que deseja sair do grupo?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-danger"
                  onClick={handleLeave}
                  disabled={actionLoading}
                  style={{ fontSize: 12, flex: 1 }}
                >
                  {actionLoading ? 'Saindo...' : 'Confirmar'}
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmLeave(false)} style={{ fontSize: 12 }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmLeave(true)}
              style={{
                fontSize: 12, color: 'var(--danger)', width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <LogOut size={13} /> Sair do grupo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
