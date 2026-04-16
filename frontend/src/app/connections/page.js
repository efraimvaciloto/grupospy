'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { numbers as numbersApi } from '../../lib/api'
import { Smartphone, Plus, RefreshCw, Wifi, WifiOff, QrCode, Trash2, Users, Lock } from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    connected:    { label: 'Conectado',    cls: 'badge-success' },
    connecting:   { label: 'Conectando...', cls: 'badge-warning' },
    disconnected: { label: 'Desconectado', cls: 'badge-danger' },
    pending:      { label: 'Pendente',     cls: 'badge-neutral' },
  }
  const { label, cls } = map[status] || map.pending
  const isConnected = status === 'connected'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {isConnected && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--color-success)',
          display: 'inline-block',
          boxShadow: '0 0 0 0 rgba(16,185,129,0.6)',
          animation: 'pulse-green 1.8s infinite',
        }} />
      )}
      <span className={`badge ${cls}`}>{label}</span>
    </span>
  )
}

function QRModal({ number, onClose, onConnected }) {
  const [qr, setQr]         = useState(null)
  const [status, setStatus] = useState('loading')

  async function startConnection() {
    setStatus('loading')
    try {
      const res = await numbersApi.connect(number.id, {})
      if (res.status === 'connected') { onConnected(); return }
      if (res.qr_code) setQr(res.qr_code)
      setStatus('waiting')
    } catch {
      try {
        const res = await numbersApi.getQR(number.id)
        if (res.status === 'connected') { onConnected(); return }
        if (res.qr_code) setQr(res.qr_code)
        setStatus('waiting')
      } catch {
        setStatus('error')
      }
    }
  }

  useEffect(() => {
    startConnection()
    const interval = setInterval(async () => {
      try {
        const res = await numbersApi.getQR(number.id)
        if (res.status === 'connected') { clearInterval(interval); onConnected() }
        if (res.qr_code) setQr(res.qr_code)
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [number.id])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      backdropFilter: 'blur(6px)',
    }}>
      <div className="card" style={{
        width: 380, padding: 32, textAlign: 'center',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
          background: 'var(--color-accent-glow)',
          border: '1px solid var(--color-accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <QrCode size={22} color="var(--color-accent-primary)" />
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          Conectar WhatsApp
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          Abra o WhatsApp no celular, va em{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>Dispositivos conectados</strong>{' '}
          e escaneie o codigo abaixo.
        </p>

        {status === 'loading' && (
          <div style={{
            width: 220, height: 220, margin: '0 auto 20px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)', fontSize: 13,
          }}>
            Gerando QR Code...
          </div>
        )}

        {qr && (
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code"
            style={{
              width: 220, height: 220, margin: '0 auto 20px', display: 'block',
              borderRadius: 12, border: '1px solid var(--color-border)',
            }}
          />
        )}

        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          QR atualiza automaticamente a cada 5 segundos
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={startConnection} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Novo QR
          </button>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card" style={{ border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 4 }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 12 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ flex: 1, height: 34, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 8 }} />
      </div>
    </div>
  )
}

export default function ConnectionsPage() {
  const [numList, setNumList] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrTarget, setQrTarget] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [showForm, setShowForm] = useState(false)

  const tenant = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_tenant') || '{}') : {}
  const maxNumbers = tenant?.maxNumbers || 1
  const usedNumbers = numList.length
  const atLimit = usedNumbers >= maxNumbers

  async function load() {
    try {
      const res = await numbersApi.list()
      setNumList(Array.isArray(res) ? res : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!newLabel.trim()) return
    if (atLimit) {
      alert(`Você atingiu o limite de ${maxNumbers} conexão(ões) do seu plano.`)
      return
    }
    setCreating(true)
    try {
      await numbersApi.create({ label: newLabel })
      setNewLabel(''); setShowForm(false)
      await load()
    } catch (err) {
      alert(err.message)
    } finally { setCreating(false) }
  }

  async function syncGroups(numberId) {
    try {
      const res = await numbersApi.syncGroups(numberId, false)
      alert(`${res.synced} grupos sincronizados!`)
    } catch (err) { alert(err.message) }
  }

  async function syncContacts(numberId) {
    try {
      const res = await numbersApi.syncContacts(numberId)
      alert(`${res.synced || res.imported || 0} contatos sincronizados!`)
    } catch (err) { alert(err.message) }
  }

  async function remove(id) {
    if (!confirm('Remover este numero? Todos os grupos e mensagens serao deletados.')) return
    await numbersApi.remove(id)
    await load()
  }

  const pct = maxNumbers > 0 ? Math.min(100, Math.round((usedNumbers / maxNumbers) * 100)) : 0

  return (
    <AppLayout>
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
          70% { box-shadow: 0 0 0 7px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Conexoes</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Numeros de WhatsApp conectados</p>
          </div>
          <button
            className={`btn ${atLimit ? '' : 'btn-primary'}`}
            onClick={() => atLimit ? null : setShowForm(true)}
            disabled={atLimit}
            title={atLimit ? `Limite de ${maxNumbers} conexão(ões) atingido` : 'Nova Conexao'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: atLimit ? 0.6 : 1, cursor: atLimit ? 'not-allowed' : 'pointer' }}
          >
            {atLimit ? <Lock size={14} /> : <Plus size={14} />}
            {atLimit ? 'Limite atingido' : 'Nova Conexao'}
          </button>
        </div>

        {/* Usage bar */}
        <div style={{
          padding: '12px 16px', marginBottom: 20,
          background: 'var(--color-bg-elevated, #16161F)',
          border: '1px solid var(--color-border, #2A2A3A)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            Conexões: <strong style={{ color: 'var(--color-text-primary)' }}>{usedNumbers} / {maxNumbers}</strong>
          </span>
          <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 99,
              background: pct >= 100 ? 'var(--color-danger, #EF4444)' : pct >= 80 ? '#F59E0B' : 'var(--color-accent-primary, #7C3AED)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {atLimit && (
            <a
              href="/billing/upgrade"
              style={{ fontSize: 11, color: 'var(--color-accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 600 }}
            >
              Upgrade →
            </a>
          )}
        </div>

        {/* Form novo numero */}
        {showForm && (
          <div className="card" style={{ marginBottom: 20, border: '1px solid var(--color-border-focus)', padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 14 }}>Novo numero</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                placeholder="Ex: Numero Comercial, Suporte..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={create} disabled={creating}>
                {creating ? 'Criando...' : 'Criar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
              Apos criar, clique em "Conectar" para escanear o QR Code.
            </p>
          </div>
        )}

        {/* Lista de numeros */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {numList.map(num => (
              <div key={num.id} className="card" style={{
                border: '1px solid var(--color-border)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-primary)'
                  e.currentTarget.style.boxShadow = '0 4px 20px var(--color-accent-glow)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Status color bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 3, borderRadius: '12px 12px 0 0',
                  background: num.status === 'connected' ? 'var(--color-success)'
                    : num.status === 'connecting' ? 'var(--color-warning)'
                    : 'var(--color-text-muted)',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--color-accent-glow), rgba(109,40,217,0.2))',
                      border: '1px solid var(--color-accent-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Smartphone size={22} color="var(--color-accent-primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{num.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {num.phoneNumber || 'Sem numero'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={num.status} />
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                  fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16,
                  padding: '10px 12px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 8, border: '1px solid var(--color-border)',
                }}>
                  <div>Grupos: <strong style={{ color: 'var(--color-text-primary)' }}>{num.groupCount || 0}</strong></div>
                  <div>Tipo: <strong style={{ color: 'var(--color-text-primary)' }}>{num.isBusiness ? 'Business' : 'Pessoal'}</strong></div>
                  {num.profileName && (
                    <div style={{ gridColumn: '1/-1' }}>
                      Perfil: <strong style={{ color: 'var(--color-text-primary)' }}>{num.profileName}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {num.status !== 'connected' && (
                    <button className="btn btn-primary" onClick={() => setQrTarget(num)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <QrCode size={13} /> Conectar
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={() => syncGroups(num.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <RefreshCw size={13} /> Sincronizar grupos
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={() => syncContacts(num.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Users size={13} /> Sincronizar contatos
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={async () => {
                      await numbersApi.disconnect(num.id); load()
                    }} style={{ padding: '6px 10px', color: 'var(--color-danger)' }} title="Desconectar">
                      <WifiOff size={14} />
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={() => remove(num.id)}
                    style={{ color: 'var(--color-danger)', padding: '6px 10px' }} title="Remover">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {numList.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center', padding: 64,
              }}>
                <Wifi size={48} style={{
                  color: 'var(--color-text-primary)', opacity: 0.2,
                  display: 'block', margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  Nenhuma conexao configurada
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Adicione um numero para comecar a gerenciar seus grupos.
                </p>
                <button className="btn btn-primary" onClick={() => !atLimit && setShowForm(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={13} /> Nova Conexao
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {qrTarget && (
        <QRModal
          number={qrTarget}
          onClose={() => { setQrTarget(null); load() }}
          onConnected={() => { setQrTarget(null); load() }}
        />
      )}
    </AppLayout>
  )
}
