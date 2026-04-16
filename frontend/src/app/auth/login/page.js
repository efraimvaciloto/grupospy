'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { auth } from '../../../lib/api'
import { Zap, CheckCircle, Users, Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

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
    <div style={{ minHeight: '100vh', display: 'flex' }} className="bg-bg-primary">
      {/* LEFT PANEL — branding */}
      <div
        className="hidden md:flex"
        style={{
          width: '50%',
          background: 'linear-gradient(160deg, #0A0A0F 0%, #1a0533 50%, #0A0A0F 100%)',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtle radial glow */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 360, width: '100%' }}>
          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <Image src="/logo.png" alt="Grupo do Zap" width={200} height={60} style={{ objectFit: 'contain', objectPosition: 'left' }} />
          </div>

          {/* Tagline */}
          <p style={{
            fontSize: 16,
            color: 'var(--color-text-secondary, #8B8BA7)',
            marginBottom: 48,
            lineHeight: 1.6,
          }}>
            Monitor inteligente de grupos WhatsApp
          </p>

          {/* Feature bullets */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { Icon: CheckCircle, label: 'Monitoramento em tempo real' },
              { Icon: Zap,         label: 'Alertas automáticos por IA' },
              { Icon: Users,       label: 'Gestão de grupos simplificada' },
            ].map(({ Icon, label }) => (
              <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(124,58,237,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color="var(--color-accent-primary, #7C3AED)" />
                </div>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          background: 'var(--color-bg-primary, #0A0A0F)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile logo — shown only when left panel is hidden */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
            <Image src="/favicon.png" alt="Grupo do Zap" width={48} height={48} style={{ borderRadius: 14, objectFit: 'contain', margin: '0 auto 12px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)' }}>Grupo do Zap</h1>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 26, fontWeight: 700,
              color: 'var(--color-text-primary, #F1F0FF)',
              marginBottom: 6,
            }}>
              Bem-vindo de volta
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>
              Entre na sua conta
            </p>
          </div>

          {/* Card */}
          <div className="card" style={{ padding: 28 }}>
            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                color: 'var(--color-danger, #EF4444)',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--color-text-secondary, #8B8BA7)',
                  display: 'block', marginBottom: 6,
                }}>
                  Email
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--color-text-secondary, #8B8BA7)',
                  display: 'block', marginBottom: 6,
                }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 42 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted, #4A4A6A)',
                      display: 'flex', alignItems: 'center',
                      padding: 0,
                    }}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ marginTop: 4, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Forgot password */}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <a
                href="/auth/forgot-password"
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-muted, #4A4A6A)',
                  textDecoration: 'none',
                }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-accent-primary, #7C3AED)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted, #4A4A6A)'}
              >
                Esqueci minha senha
              </a>
            </div>
          </div>

          {/* Register link */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)' }}>
            Não tem conta?{' '}
            <a
              href="/auth/register"
              style={{ color: 'var(--color-accent-primary, #7C3AED)', textDecoration: 'none', fontWeight: 500 }}
            >
              Criar conta grátis
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
