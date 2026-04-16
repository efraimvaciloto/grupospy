'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '../../../components/layout/AppLayout'
import { plans as plansApi, auth } from '../../../lib/api'
import {
  Zap, Check, Users, Smartphone, MessageSquare, BarChart2,
  Shield, Sparkles, ArrowLeft, Loader2, AlertCircle, Crown,
  Rocket, Building2, ChevronRight,
} from 'lucide-react'

// ─── Fallback plans ───────────────────────────────────────────
const FALLBACK_PLANS = [
  {
    id: null, slug: 'starter', name: 'Starter',
    priceCents: 9700, maxNumbers: 1, maxGroups: 10,
    description: 'Ideal para começar a monitorar seus grupos.',
    icon: Rocket,
    color: '#3B82F6',
    colorDim: 'rgba(59,130,246,0.12)',
    colorBorder: 'rgba(59,130,246,0.3)',
    features: [
      '1 número WhatsApp',
      'Até 10 grupos monitorados',
      'Alertas de palavras-chave',
      'Resumos automáticos',
      'Suporte por e-mail',
    ],
  },
  {
    id: null, slug: 'growth', name: 'Growth',
    priceCents: 24700, maxNumbers: 3, maxGroups: 90,
    description: 'Para equipes que precisam de mais escala.',
    icon: Zap,
    color: '#7C3AED',
    colorDim: 'rgba(124,58,237,0.12)',
    colorBorder: 'rgba(124,58,237,0.35)',
    popular: true,
    features: [
      '3 números WhatsApp',
      'Até 90 grupos monitorados',
      'Alertas de palavras-chave',
      'Resumos automáticos',
      'Análise de sentimento',
      'Disparo em massa',
      'Suporte prioritário',
    ],
  },
  {
    id: null, slug: 'business', name: 'Business',
    priceCents: 69700, maxNumbers: 10, maxGroups: -1,
    description: 'Poder total, sem limites de grupos.',
    icon: Building2,
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.10)',
    colorBorder: 'rgba(245,158,11,0.3)',
    features: [
      '10 números WhatsApp',
      'Grupos ilimitados',
      'Alertas de palavras-chave',
      'Resumos automáticos',
      'Análise de sentimento',
      'Disparo em massa',
      'API de integração',
      'Gerente de conta dedicado',
    ],
  },
]

function fmtPrice(cents) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function mergePlans(fetched) {
  if (!fetched || !fetched.length) return FALLBACK_PLANS
  return FALLBACK_PLANS.map(fp => {
    const found = fetched.find(p => p.slug === fp.slug)
    return found ? { ...fp, ...found, icon: fp.icon, color: fp.color, colorDim: fp.colorDim, colorBorder: fp.colorBorder, features: fp.features, popular: fp.popular } : fp
  })
}

// ─── Reason Banner ────────────────────────────────────────────
function ReasonBanner({ reason }) {
  if (!reason) return null
  const map = {
    trial_expired: {
      msg: 'Seu período de teste expirou. Escolha um plano para continuar usando o GruposPy.',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.25)',
    },
    limit_reached: {
      msg: 'Você atingiu o limite do seu plano atual. Faça upgrade para continuar.',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.25)',
    },
    upgrade: {
      msg: 'Desbloqueie recursos avançados fazendo upgrade do seu plano.',
      color: '#7C3AED',
      bg: 'rgba(124,58,237,0.08)',
      border: 'rgba(124,58,237,0.25)',
    },
  }
  const info = map[reason] || map.upgrade
  return (
    <div style={{
      background: info.bg,
      border: `1px solid ${info.border}`,
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 28,
    }}>
      <AlertCircle size={16} color={info.color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: info.color, fontWeight: 500 }}>{info.msg}</span>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────
function PlanCard({ plan, currentSlug, loading, onSelect }) {
  const isCurrent = currentSlug === plan.slug
  const isPopular = plan.popular
  const Icon = plan.icon

  return (
    <div style={{
      position: 'relative',
      background: isPopular
        ? `linear-gradient(160deg, rgba(124,58,237,0.10) 0%, var(--color-bg-secondary, #111118) 60%)`
        : 'var(--color-bg-secondary, #111118)',
      border: `1px solid ${isCurrent ? plan.colorBorder : isPopular ? plan.colorBorder : 'var(--color-border, #2A2A3A)'}`,
      borderRadius: 16,
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isPopular ? `0 0 0 1px ${plan.colorBorder}, 0 8px 32px rgba(124,58,237,0.08)` : 'none',
      cursor: isCurrent ? 'default' : 'pointer',
    }}
      onMouseEnter={e => {
        if (!isCurrent) e.currentTarget.style.borderColor = plan.colorBorder
      }}
      onMouseLeave={e => {
        if (!isCurrent && !isPopular) e.currentTarget.style.borderColor = 'var(--color-border, #2A2A3A)'
        if (isCurrent) e.currentTarget.style.borderColor = plan.colorBorder
      }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-accent-primary, #7C3AED)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 14px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          MAIS POPULAR
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div style={{
          position: 'absolute',
          top: -12,
          right: 20,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          color: '#10B981',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 12px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
        }}>
          PLANO ATUAL
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: plan.colorDim,
          border: `1px solid ${plan.colorBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={plan.color} />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', lineHeight: 1.2 }}>
            {plan.name}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)', marginTop: 2 }}>
            {plan.description}
          </p>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: plan.color, letterSpacing: '-0.02em' }}>
            {fmtPrice(plan.priceCents)}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)' }}>/mês</span>
        </div>
      </div>

      {/* Limits */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--color-bg-elevated, #16161F)',
          border: '1px solid var(--color-border, #2A2A3A)',
          borderRadius: 6, padding: '4px 10px',
        }}>
          <Smartphone size={12} color="var(--color-text-muted, #4A4A6A)" />
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #8B8BA7)', fontWeight: 600 }}>
            {plan.maxNumbers} número{plan.maxNumbers > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--color-bg-elevated, #16161F)',
          border: '1px solid var(--color-border, #2A2A3A)',
          borderRadius: 6, padding: '4px 10px',
        }}>
          <Users size={12} color="var(--color-text-muted, #4A4A6A)" />
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #8B8BA7)', fontWeight: 600 }}>
            {plan.maxGroups === -1 ? 'Grupos ilimitados' : `${plan.maxGroups} grupos`}
          </span>
        </div>
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: plan.colorDim,
              border: `1px solid ${plan.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              <Check size={9} color={plan.color} strokeWidth={3} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)', lineHeight: 1.4 }}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrent && onSelect(plan)}
        disabled={isCurrent || loading}
        style={{
          width: '100%',
          padding: '11px 0',
          borderRadius: 10,
          border: isCurrent ? '1px solid rgba(16,185,129,0.3)' : `1px solid ${plan.colorBorder}`,
          background: isCurrent
            ? 'rgba(16,185,129,0.08)'
            : isPopular
              ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`
              : plan.colorDim,
          color: isCurrent ? '#10B981' : isPopular ? '#fff' : plan.color,
          fontSize: 14,
          fontWeight: 700,
          cursor: isCurrent ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'opacity 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.opacity = '0.85' }}
        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.opacity = '1' }}
      >
        {loading ? (
          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
        ) : isCurrent ? (
          <>
            <Check size={14} strokeWidth={3} />
            Plano atual
          </>
        ) : (
          <>
            Assinar {plan.name}
            <ChevronRight size={15} />
          </>
        )}
      </button>
    </div>
  )
}

// ─── Inner page content (uses useSearchParams) ────────────────
function UpgradePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reason = searchParams.get('reason')

  const [plans, setPlans] = useState(FALLBACK_PLANS)
  const [currentSlug, setCurrentSlug] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [successPlan, setSuccessPlan] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoadingData(true)
      try {
        const [plansData, meData] = await Promise.allSettled([
          plansApi.list(),
          auth.me(),
        ])
        if (plansData.status === 'fulfilled' && plansData.value?.length) {
          setPlans(mergePlans(plansData.value))
        }
        if (meData.status === 'fulfilled' && meData.value?.tenant) {
          setCurrentSlug(meData.value.tenant.planSlug || null)
        }
      } catch {}
      setLoadingData(false)
    }
    load()
  }, [])

  async function handleSelect(plan) {
    if (!plan.id) {
      // No backend checkout yet — show contact message
      setError(`Para assinar o plano ${plan.name}, entre em contato com o suporte ou aguarde a integração com o gateway de pagamento.`)
      return
    }
    setLoadingPlan(plan.slug)
    setError('')
    try {
      // TODO: call checkout API when available
      // await billing.checkout(plan.id)
      await new Promise(r => setTimeout(r, 1200)) // placeholder
      setSuccessPlan(plan)
    } catch (err) {
      setError(err.message || 'Erro ao processar. Tente novamente.')
    } finally {
      setLoadingPlan(null)
    }
  }

  if (successPlan) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={28} color="#10B981" strokeWidth={3} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 10 }}>
          Plano {successPlan.name} ativado!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)', lineHeight: 1.6, marginBottom: 28 }}>
          Sua assinatura foi confirmada. Aproveite todos os recursos do plano {successPlan.name}.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Ir para o dashboard
          <ChevronRight size={15} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--page-padding, 28px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted, #4A4A6A)', fontSize: 13,
          padding: '4px 0', marginBottom: 28,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-secondary, #8B8BA7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted, #4A4A6A)'}
      >
        <ArrowLeft size={15} />
        Voltar
      </button>

      {/* Reason banner */}
      <ReasonBanner reason={reason} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 20, padding: '4px 14px',
          marginBottom: 16,
        }}>
          <Sparkles size={13} color="var(--color-accent-primary, #7C3AED)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent-primary, #7C3AED)' }}>
            Planos e Preços
          </span>
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
          color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 12,
        }}>
          Escolha o plano ideal
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary, #8B8BA7)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Monitore seus grupos WhatsApp, receba alertas em tempo real e automatize seu gerenciamento.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          maxWidth: 700, margin: '0 auto 24px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          color: 'var(--color-danger, #EF4444)', fontSize: 13,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Plan cards */}
      {loadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="var(--color-text-muted, #4A4A6A)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'stretch',
          marginBottom: 48,
        }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              currentSlug={currentSlug}
              loading={loadingPlan === plan.slug}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Feature highlights */}
      <div style={{
        background: 'var(--color-bg-secondary, #111118)',
        border: '1px solid var(--color-border, #2A2A3A)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 20, textAlign: 'center' }}>
          Todos os planos incluem
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {[
            { icon: Shield, label: 'Segurança de dados', desc: 'Seus dados são criptografados e protegidos' },
            { icon: MessageSquare, label: 'Alertas em tempo real', desc: 'Notificações imediatas por palavras-chave' },
            { icon: BarChart2, label: 'Relatórios detalhados', desc: 'Acompanhe a atividade dos seus grupos' },
            { icon: Crown, label: 'Sem taxa de setup', desc: 'Ative agora mesmo, sem custos ocultos' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--color-bg-elevated, #16161F)',
                border: '1px solid var(--color-border, #2A2A3A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color="var(--color-accent-primary, #7C3AED)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 2 }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)', lineHeight: 1.5 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help text */}
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)' }}>
        Dúvidas? Entre em contato pelo{' '}
        <a href="mailto:suporte@grupospy.com.br" style={{ color: 'var(--color-accent-primary, #7C3AED)', textDecoration: 'none' }}>
          suporte@grupospy.com.br
        </a>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Page wrapper with Suspense for useSearchParams ───────────
export default function BillingUpgradePage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={28} color="#4A4A6A" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <UpgradePageContent />
      </Suspense>
    </AppLayout>
  )
}
