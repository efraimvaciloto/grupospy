'use client'
import { useState } from 'react'
import { auth } from '../../../lib/api'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await auth.login(form)
      localStorage.setItem('gs_token', res.access_token)
      localStorage.setItem('gs_tenant', JSON.stringify(res.tenant))
      localStorage.setItem('gs_user', JSON.stringify(res.user))
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Zap size={24} color="#000" fill="#000" />
          </div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>GrupoSpy</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Monitor inteligente de grupos WhatsApp</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, marginBottom: 24 }}>Entrar na conta</h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: 'var(--danger)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Senha</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, justifyContent: 'center' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Não tem conta?{' '}
            <a href="/auth/register" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Criar conta grátis</a>
          </p>
        </div>
      </div>
    </div>
  )
}
