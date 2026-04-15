'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { numbers as numbersApi } from '../../lib/api'
import { Smartphone, Plus, RefreshCw, Wifi, WifiOff, QrCode, Trash2, Users } from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    connected:    { label: 'Conectado',    cls: 'badge-green' },
    connecting:   { label: 'Conectando...', cls: 'badge-yellow' },
    disconnected: { label: 'Desconectado', cls: 'badge-red' },
    pending:      { label: 'Pendente',     cls: 'badge-gray' },
  }
  const { label, cls } = map[status] || map.pending
  return <span className={`badge ${cls}`}>{label}</span>
}

function QRModal({ number, onClose, onConnected }) {
  const [qr, setQr]         = useState(null)
  const [status, setStatus] = useState('loading')

  async function startConnection() {
    setStatus('loading')
    try {
      // Primeiro inicia a conexão na uazapi (gera o QR code)
      const res = await numbersApi.connect(number.id, {})
      if (res.status === 'connected') { onConnected(); return }
      if (res.qr_code) setQr(res.qr_code)
      setStatus('waiting')
    } catch {
      // Se falhar o connect, tenta buscar status existente
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="card" style={{ width: 360, padding: 28, textAlign: 'center' }}>
        <h3 style={{ marginBottom: 8 }}>Conectar WhatsApp</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
        </p>

        {status === 'loading' && (
          <div style={{ padding: 40, color: 'var(--muted)' }}>Gerando QR Code...</div>
        )}

        {qr && (
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code"
            style={{ width: 220, height: 220, margin: '0 auto 20px', display: 'block', borderRadius: 8 }}
          />
        )}

        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          QR atualiza automaticamente a cada 5 segundos
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={startConnection} style={{ flex: 1 }}>
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

export default function ConnectionsPage() {
  const [numList, setNumList] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrTarget, setQrTarget] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function load() {
    try {
      const res = await numbersApi.list()
      setNumList(Array.isArray(res) ? res : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!newLabel.trim()) return
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
    if (!confirm('Remover este número? Todos os grupos e mensagens serão deletados.')) return
    await numbersApi.remove(id)
    await load()
  }

  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>Conexões</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Números de WhatsApp conectados</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Adicionar número
          </button>
        </div>

        {/* Form novo número */}
        {showForm && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 14 }}>Novo número</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                placeholder="Ex: Número Comercial, Suporte..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
              />
              <button className="btn btn-primary" onClick={create} disabled={creating}>
                {creating ? 'Criando...' : 'Criar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              Após criar, clique em "Conectar" para escanear o QR Code.
            </p>
          </div>
        )}

        {/* Lista de números */}
        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {numList.map(num => (
              <div key={num.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: 'var(--hover)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Smartphone size={20} color="var(--brand)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{num.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {num.phoneNumber || 'Sem número'}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={num.status} />
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                  fontSize: 12, color: 'var(--muted)', marginBottom: 16,
                }}>
                  <div>Grupos: <strong style={{ color: 'var(--text)' }}>{num.groupCount || 0}</strong></div>
                  <div>Tipo: <strong style={{ color: 'var(--text)' }}>{num.isBusiness ? 'Business' : 'Pessoal'}</strong></div>
                  {num.profileName && (
                    <div style={{ gridColumn: '1/-1' }}>
                      Perfil: <strong style={{ color: 'var(--text)' }}>{num.profileName}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {num.status !== 'connected' && (
                    <button className="btn btn-primary" onClick={() => setQrTarget(num)} style={{ flex: 1 }}>
                      <QrCode size={13} /> Conectar
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={() => syncGroups(num.id)} style={{ flex: 1 }}>
                      <RefreshCw size={13} /> Sincronizar grupos
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={() => syncContacts(num.id)} style={{ flex: 1 }}>
                      <Users size={13} /> Sincronizar contatos
                    </button>
                  )}
                  {num.status === 'connected' && (
                    <button className="btn btn-ghost" onClick={async () => {
                      await numbersApi.disconnect(num.id); load()
                    }}>
                      <WifiOff size={13} />
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={() => remove(num.id)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {numList.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 14, padding: 24 }}>
                Nenhum número conectado. Clique em "Adicionar número" para começar.
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
