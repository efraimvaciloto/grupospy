'use client'
import { useState } from 'react'
import { auth } from '../../../lib/api'
import { Zap } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm]   = useState({ name: '', email: '', password: '', companyName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await auth.register(form)
      localStorage.setItem('gs_token',  res.access_token)
      localStorage.setItem('gs_tenant', JSON.stringify(res.tenant))
      localStorage.setItem('gs_user',   JSON.stringify(res.user))
      window.location.href = '/connections'   // primeiro passo: conectar número
    } catch (err) {
      setError(err.message || 'Erro ao criar conta')
    } finally { setLoading(false) }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={form[key]} onChange={set(key)} required />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Zap size={24} color="#000" fill="#000" />
          </div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Criar conta grátis</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>7 dias grátis · Sem cartão de crédito</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: 'var(--danger)', fontSize: 13,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {field('Seu nome', 'name', 'text', 'João Silva')}
            {field('Nome da empresa', 'companyName', 'text', 'Imobiliária XYZ')}
            {field('Email', 'email', 'email', 'joao@empresa.com')}
            {field('Senha', 'password', 'password', 'Mínimo 8 caracteres')}

            <button className="btn btn-primary" type="submit"
              disabled={loading} style={{ marginTop: 8, justifyContent: 'center' }}>
              {loading ? 'Criando conta...' : 'Começar grátis'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Já tem conta?{' '}
            <a href="/auth/login" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Entrar</a>
          </p>
        </div>
      </div>
    </div>
  )
}
