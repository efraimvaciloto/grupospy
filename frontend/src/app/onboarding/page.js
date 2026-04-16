'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { plans as plansApi, numbers as numbersApi, contacts as contactsApi, groups as groupsApi, auth as authApi, extraGroups as extraGroupsApi } from '../../lib/api'
import { staggerChildren, slideInUp } from '../../lib/animations'
import { Zap, Check, QrCode, Users, Loader2, Search, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react'

// ─── Fallback plans (camelCase to match postgres.camel transform) ──────────
const FALLBACK_PLANS = [
  { id: null, slug: 'starter',  name: 'Starter',  priceCents: 9700,  maxNumbers: 1,  maxGroups: 10 },
  { id: null, slug: 'growth',   name: 'Growth',   priceCents: 24700, maxNumbers: 3,  maxGroups: 90 },
  { id: null, slug: 'business', name: 'Business', priceCents: 69700, maxNumbers: 10, maxGroups: -1 },
]

function getMatchingPlan(groupCount, planList) {
  const sorted = [...planList].sort((a, b) => a.priceCents - b.priceCents)
  return sorted.find(p => p.maxGroups === -1 || p.maxGroups >= groupCount) || sorted[sorted.length - 1]
}

function fmtPrice(cents) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ─── Step Indicator ───────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const n = i + 1
        const done = current > n
        const active = current === n
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? 'var(--color-accent-primary, #7C3AED)' : active ? 'rgba(124,58,237,0.2)' : 'var(--color-bg-elevated, #16161F)',
                border: `2px solid ${done || active ? 'var(--color-accent-primary, #7C3AED)' : 'var(--color-border, #2A2A3A)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done ? '#fff' : active ? 'var(--color-accent-primary, #7C3AED)' : 'var(--color-text-muted, #4A4A6A)',
                fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
              }}>
                {done ? <Check size={14} /> : n}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 600 : 400,
                color: active ? 'var(--color-text-primary, #F1F0FF)' : 'var(--color-text-muted, #4A4A6A)',
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 64, height: 2, margin: '0 8px',
                marginBottom: 18,
                background: current > n + 1 ? 'var(--color-accent-primary, #7C3AED)' : 'var(--color-border, #2A2A3A)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── QR Modal ─────────────────────────────────────────────────
function QRModal({ number, onClose, onConnected }) {
  const [qr, setQr] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    async function init() {
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
    init()
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      backdropFilter: 'blur(6px)',
    }}>
      <div className="card" style={{ width: 380, padding: 32, textAlign: 'center', border: '1px solid var(--color-border)' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid var(--color-accent-primary, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <QrCode size={22} color="var(--color-accent-primary, #7C3AED)" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Conectar WhatsApp
        </h3>
        <p style={{ color: 'var(--color-text-secondary, #8B8BA7)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          Abra o WhatsApp no celular, va em{' '}
          <strong style={{ color: 'var(--color-text-primary, #F1F0FF)' }}>Dispositivos conectados</strong>{' '}
          e escaneie o codigo abaixo.
        </p>
        {status === 'loading' && (
          <div style={{
            width: 220, height: 220, margin: '0 auto 20px',
            background: 'var(--color-bg-elevated, #16161F)',
            border: '1px solid var(--color-border, #2A2A3A)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted, #4A4A6A)', fontSize: 13, gap: 8,
          }}>
            <Loader2 size={16} className="animate-spin" /> Gerando QR...
          </div>
        )}
        {status === 'error' && (
          <div style={{
            width: 220, height: 220, margin: '0 auto 20px',
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-danger, #EF4444)', fontSize: 13,
          }}>
            Erro ao gerar QR Code
          </div>
        )}
        {qr && (
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code"
            style={{ width: 220, height: 220, margin: '0 auto 20px', display: 'block', borderRadius: 12, border: '1px solid var(--color-border)' }}
          />
        )}
        <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)', marginBottom: 20 }}>
          O QR Code atualiza automaticamente a cada 30s
        </p>
        <button
          className="btn"
          onClick={onClose}
          style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Skip without connect modal ───────────────────────────────
function SkipWarningModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      backdropFilter: 'blur(6px)',
    }}>
      <div className="card" style={{ width: 380, padding: 28, border: '1px solid var(--color-border)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 16,
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={20} color="#F59E0B" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Continuar sem conectar?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)', lineHeight: 1.6, marginBottom: 20 }}>
          Sem uma conexão WhatsApp, seus grupos não serão sincronizados e você não poderá monitorar mensagens.
          Você pode conectar mais tarde em <strong style={{ color: 'var(--color-text-primary, #F1F0FF)' }}>Conexões</strong>.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center', display: 'flex' }}
          >
            Voltar e conectar
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center', display: 'flex', color: 'var(--color-text-muted, #4A4A6A)', fontSize: 13 }}
          >
            Continuar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 1 — Plan Selector ───────────────────────────────────
const PLAN_FEATURES = {
  starter:  ['1 número WhatsApp', '10 grupos monitorados', 'Monitoramento por IA', 'Alertas automáticos', 'Broadcasts'],
  growth:   ['3 números WhatsApp', 'Até 90 grupos', 'IA de sentimento avançada', 'Alertas automáticos', 'Broadcasts', 'Exportar PDF'],
  business: ['10 números WhatsApp', 'Grupos ilimitados', 'IA premium completa', 'Alertas automáticos', 'Broadcasts', 'Exportar PDF', 'Suporte prioritário'],
}

function Step1PlanSelector({ onNext }) {
  const [planList, setPlanList]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [groupCount, setGroupCount]       = useState(10)
  const [recommendedPlan, setRecommendedPlan] = useState(null)
  const [selectedPlan, setSelectedPlan]   = useState(null)
  const [manuallySelected, setManuallySelected] = useState(false)

  useEffect(() => {
    plansApi.list()
      .then(data => {
        const list = data?.length ? data : FALLBACK_PLANS
        setPlanList(list)
        const match = getMatchingPlan(groupCount, list)
        setRecommendedPlan(match)
        setSelectedPlan(match)
      })
      .catch(() => {
        setPlanList(FALLBACK_PLANS)
        const match = getMatchingPlan(groupCount, FALLBACK_PLANS)
        setRecommendedPlan(match)
        setSelectedPlan(match)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!planList.length) return
    const match = getMatchingPlan(groupCount, planList)
    setRecommendedPlan(match)
    if (!manuallySelected) setSelectedPlan(match)
  }, [groupCount, planList])

  function handleSelectPlan(plan) {
    setSelectedPlan(plan)
    setManuallySelected(true)
  }

  function handleCountInput(e) {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) setGroupCount(Math.max(1, Math.min(250, val)))
  }

  return (
    <div style={{ width: '100%', maxWidth: 800 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Escolha seu plano
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>
          7 dias grátis · Cancele quando quiser · Sem cartão agora
        </p>
      </div>

      {/* Calculator */}
      <div style={{
        padding: '16px 20px', marginBottom: 32,
        borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)',
        background: 'rgba(124,58,237,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 3 }}>
            Quantos grupos você quer monitorar?
          </p>
          {recommendedPlan && recommendedPlan.maxGroups > 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-accent-primary, #7C3AED)' }}>
              Recomendado: <strong>{recommendedPlan.name}</strong> — {fmtPrice(Math.round(recommendedPlan.priceCents / recommendedPlan.maxGroups))}/grupo/mês
            </p>
          )}
          {recommendedPlan?.maxGroups === -1 && (
            <p style={{ fontSize: 12, color: 'var(--color-accent-primary, #7C3AED)' }}>
              Recomendado: <strong>{recommendedPlan.name}</strong> — grupos ilimitados
            </p>
          )}
        </div>
        <input
          type="number"
          min={1}
          max={250}
          value={groupCount}
          onChange={handleCountInput}
          style={{
            width: 80, height: 44, borderRadius: 10, border: '1px solid rgba(124,58,237,0.5)',
            background: 'var(--color-bg-elevated, #16161F)',
            color: 'var(--color-text-primary, #F1F0FF)',
            fontSize: 22, fontWeight: 800, textAlign: 'center',
            outline: 'none', flexShrink: 0,
          }}
        />
      </div>

      {/* Plan cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={24} className="animate-spin" color="var(--color-accent-primary, #7C3AED)" />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${planList.length}, 1fr)`,
          gap: 14,
          marginBottom: 28,
          alignItems: 'start',
        }}>
          {planList.map(plan => {
            const isSelected    = selectedPlan?.slug === plan.slug
            const isRecommended = recommendedPlan?.slug === plan.slug
            const features      = PLAN_FEATURES[plan.slug] || []
            const perGroup      = plan.maxGroups > 0
              ? `${fmtPrice(Math.round(plan.priceCents / plan.maxGroups))}/grupo`
              : 'Ilimitado'

            return (
              <motion.div
                key={plan.slug}
                onClick={() => handleSelectPlan(plan)}
                style={{
                  position: 'relative',
                  padding: isRecommended ? '28px 20px 20px' : '24px 20px 20px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  border: isSelected
                    ? '2px solid var(--color-accent-primary, #7C3AED)'
                    : '1px solid var(--color-border, #2A2A3A)',
                  background: isSelected
                    ? 'rgba(124,58,237,0.09)'
                    : 'var(--color-bg-secondary, #111118)',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  marginTop: isRecommended ? 0 : 14,
                }}
                whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.45)' }}
                transition={{ duration: 0.15 }}
              >
                {/* Recommended badge — only on auto-recommended plan */}
                {isRecommended && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #7C3AED, #6D28D9)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '3px 14px', borderRadius: 20,
                    whiteSpace: 'nowrap', letterSpacing: '0.06em',
                    boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                  }}>
                    RECOMENDADO
                  </div>
                )}

                {/* Plan name */}
                <p style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isRecommended ? 'var(--color-accent-primary, #7C3AED)' : 'var(--color-text-muted, #4A4A6A)',
                  marginBottom: 6,
                }}>
                  {plan.name}
                </p>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 2 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary, #F1F0FF)', lineHeight: 1 }}>
                    {fmtPrice(plan.priceCents)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)' }}>/mês</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--color-accent-primary, #7C3AED)', marginBottom: 16 }}>
                  {perGroup}
                </p>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--color-border, #2A2A3A)', marginBottom: 16 }} />

                {/* Feature list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20, flex: 1 }}>
                  {features.map(feat => (
                    <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(124,58,237,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={10} color="var(--color-accent-primary, #7C3AED)" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #8B8BA7)', lineHeight: 1.3 }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Select CTA */}
                <button
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 600,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    border: isSelected ? 'none' : '1px solid var(--color-border, #2A2A3A)',
                    background: isSelected ? 'var(--color-accent-primary, #7C3AED)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--color-text-secondary, #8B8BA7)',
                  }}
                >
                  {isSelected ? '✓ Selecionado' : 'Selecionar'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{
          fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)',
          background: 'var(--color-bg-elevated, #16161F)',
          padding: '4px 14px', borderRadius: 20,
          border: '1px solid var(--color-border, #2A2A3A)',
        }}>
          7 dias grátis · Cancele quando quiser · Sem cartão agora
        </span>
      </div>

      <button
        className="btn btn-primary"
        disabled={!selectedPlan}
        onClick={() => onNext(selectedPlan)}
        style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 8, padding: '13px 0', fontSize: 15, fontWeight: 600 }}
      >
        Começar teste grátis <Zap size={15} />
      </button>
    </div>
  )
}

// ─── Step 2 — Connect WhatsApp ────────────────────────────────
function Step2Connect({ onNext, onBack }) {
  const [numberLabel, setNumberLabel] = useState('Principal')
  const [createdNumber, setCreatedNumber] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [alreadyConnected, setAlreadyConnected] = useState(null)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [createError, setCreateError] = useState('')
  const [showSkipWarning, setShowSkipWarning] = useState(false)

  useEffect(() => {
    numbersApi.list()
      .then(list => {
        const connected = list?.find(n => n.status === 'connected')
        if (connected) setAlreadyConnected(connected)
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false))
  }, [])

  async function handleCreate() {
    setCreating(true)
    setCreateError('')
    try {
      const res = await numbersApi.create({ label: numberLabel || 'Principal' })
      setCreatedNumber(res)
      setShowQR(true)
    } catch (err) {
      setCreateError(err.message || 'Erro ao criar conexão')
    } finally {
      setCreating(false)
    }
  }

  async function handleConnected() {
    setShowQR(false)
    setSyncing(true)
    try {
      await numbersApi.syncGroups(createdNumber.id, false)
      await numbersApi.syncContacts(createdNumber.id)
    } catch {}
    setSyncing(false)
    onNext()
  }

  async function handleAlreadyConnectedContinue() {
    setSyncing(true)
    try {
      await numbersApi.syncGroups(alreadyConnected.id, false)
      await numbersApi.syncContacts(alreadyConnected.id)
    } catch {}
    setSyncing(false)
    onNext()
  }

  if (checkingExisting) {
    return (
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} className="animate-spin" color="var(--color-accent-primary, #7C3AED)" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      {showQR && createdNumber && (
        <QRModal
          number={createdNumber}
          onClose={() => setShowQR(false)}
          onConnected={handleConnected}
        />
      )}

      {showSkipWarning && (
        <SkipWarningModal
          onConfirm={() => { setShowSkipWarning(false); onNext() }}
          onCancel={() => setShowSkipWarning(false)}
        />
      )}

      {syncing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, gap: 16,
        }}>
          <Loader2 size={32} className="animate-spin" color="var(--color-accent-primary, #7C3AED)" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)' }}>
            Sincronizando grupos e contatos...
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)' }}>
            Isso pode levar alguns segundos.
          </p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Conectar WhatsApp
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>
          Conecte o número que será usado para monitorar grupos
        </p>
      </div>

      {alreadyConnected ? (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={20} color="var(--color-success, #10B981)" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)' }}>
                {alreadyConnected.label || 'Número conectado'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-success, #10B981)' }}>Número já conectado ✓</p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAlreadyConnectedContinue}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 8 }}
          >
            Continuar
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--color-text-secondary, #8B8BA7)',
              display: 'block', marginBottom: 6,
            }}>
              Nome da conexão
            </label>
            <input
              className="input"
              type="text"
              value={numberLabel}
              onChange={e => setNumberLabel(e.target.value)}
              placeholder="Principal"
            />
          </div>
          {createError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: 'var(--color-danger, #EF4444)', fontSize: 13,
            }}>
              {createError}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 8 }}
          >
            {creating ? <><Loader2 size={15} className="animate-spin" /> Criando...</> : <><QrCode size={15} /> Criar conexão</>}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setShowSkipWarning(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)',
          }}
        >
          Continuar sem conectar agora →
        </button>
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 20, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)', display: 'block',
        }}
      >
        ← Voltar
      </button>
    </div>
  )
}

// ─── Pagination bar ───────────────────────────────────────────
function PaginationBar({ page, total, limit, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <button
        className="btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
      >
        <ChevronLeft size={13} /> Anterior
      </button>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)' }}>
        {page} / {totalPages} &nbsp;·&nbsp; {total} itens
      </span>
      <button
        className="btn"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
      >
        Próxima <ChevronRight size={13} />
      </button>
    </div>
  )
}

// ─── Step 3 — Groups ──────────────────────────────────────────
function Step3Groups({ chosenPlan, onNext, onBack }) {
  const PAGE_SIZE = 15
  const [groups, setGroups]         = useState([])
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [monitored, setMonitored]   = useState(new Set())
  const [saving, setSaving]         = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [extraQty, setExtraQty]     = useState(1)
  const [buyingExtra, setBuyingExtra] = useState(false)
  const [extraPurchased, setExtraPurchased] = useState(0)

  const maxGroups = chosenPlan?.maxGroups === -1 ? Infinity : (chosenPlan?.maxGroups || 10)
  const effectiveLimit = maxGroups === Infinity ? Infinity : maxGroups + extraPurchased
  const selectedCount = monitored.size

  const fetchGroups = useCallback(async (pg, q) => {
    setLoading(true)
    try {
      const data = await groupsApi.listAll({ page: pg, limit: PAGE_SIZE, ...(q ? { search: q } : {}) })
      const list = data?.data || []
      setGroups(list)
      setTotal(data?.meta?.total || 0)
      setMonitored(prev => {
        const next = new Set(prev)
        list.forEach(g => { if (g.is_monitored) next.add(g.id) })
        return next
      })
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups(page, search) }, [page, search, fetchGroups])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function toggleMonitor(id) {
    const isCurrentlyOn = monitored.has(id)
    if (!isCurrentlyOn && effectiveLimit !== Infinity && selectedCount >= effectiveLimit) {
      setShowUpsell(true)
      return
    }
    setMonitored(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function buyExtra() {
    setBuyingExtra(true)
    try {
      await extraGroupsApi.purchase(extraQty)
      setExtraPurchased(p => p + extraQty)
      setShowUpsell(false)
    } catch (err) {
      alert(err.message || 'Erro ao comprar grupos extras')
    } finally {
      setBuyingExtra(false)
    }
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      await Promise.all(
        groups.map(g =>
          groupsApi.update(g.id, { isMonitored: monitored.has(g.id) })
        )
      )
    } catch {}
    setSaving(false)
    onNext()
  }

  const pricePerExtra = chosenPlan?.maxGroups > 0
    ? Math.round((chosenPlan.priceCents || 0) / chosenPlan.maxGroups)
    : 0
  const fmtPriceLocal = (cents) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`

  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Selecionar grupos
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>
          Escolha quais grupos deseja monitorar
        </p>
      </div>

      {/* Usage counter */}
      {effectiveLimit !== Infinity && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', marginBottom: 12,
          background: selectedCount >= effectiveLimit ? 'rgba(245,158,11,0.08)' : 'var(--color-bg-elevated, #16161F)',
          border: `1px solid ${selectedCount >= effectiveLimit ? 'rgba(245,158,11,0.4)' : 'var(--color-border, #2A2A3A)'}`,
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)' }}>
            <strong style={{ color: 'var(--color-text-primary, #F1F0FF)' }}>{selectedCount}</strong> / {effectiveLimit} grupos selecionados
          </span>
          {selectedCount >= effectiveLimit && pricePerExtra > 0 && (
            <button
              onClick={() => setShowUpsell(true)}
              style={{
                background: 'none', border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 16, padding: '3px 10px', cursor: 'pointer',
                fontSize: 12, color: '#F59E0B', fontWeight: 600,
              }}
            >
              + {fmtPriceLocal(pricePerExtra)}/grupo
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 12, display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--color-text-muted, #4A4A6A)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input"
            type="text"
            placeholder="Buscar grupo..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        <button className="btn" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}>
          Buscar
        </button>
      </form>

      {/* Upsell banner */}
      {showUpsell && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', marginBottom: 2 }}>
              Limite atingido!
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #8B8BA7)' }}>
              Quer monitorar mais grupos? Compre extras por {fmtPriceLocal(pricePerExtra)}/grupo/mês.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <input
              type="number"
              min={1}
              max={50}
              value={extraQty}
              onChange={e => setExtraQty(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: 52, padding: '4px 8px', borderRadius: 6, textAlign: 'center',
                background: 'var(--color-bg-elevated, #16161F)',
                border: '1px solid var(--color-border, #2A2A3A)',
                color: 'var(--color-text-primary, #F1F0FF)', fontSize: 13,
              }}
            />
            <button
              onClick={buyExtra}
              disabled={buyingExtra}
              style={{
                background: '#F59E0B', border: 'none', borderRadius: 8,
                padding: '6px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#000',
              }}
            >
              {buyingExtra ? '...' : `+${extraQty} grupo${extraQty > 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setShowUpsell(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted, #4A4A6A)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} className="animate-spin" color="var(--color-accent-primary, #7C3AED)" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <Users size={40} color="var(--color-text-muted, #4A4A6A)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
            {search ? 'Nenhum grupo encontrado' : 'Nenhum grupo ainda'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)', marginBottom: 24 }}>
            {search ? 'Tente outro termo de busca.' : 'Os grupos aparecem após sincronizar um número WhatsApp.'}
          </p>
          <button className="btn btn-primary" onClick={onNext} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 auto' }}>
            Pular
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 8, marginBottom: 8 }}>
            {groups.map(g => {
              const isOn = monitored.has(g.id)
              const atLimit = !isOn && effectiveLimit !== Infinity && selectedCount >= effectiveLimit
              return (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, cursor: atLimit ? 'not-allowed' : 'pointer',
                    transition: 'background 0.1s',
                    opacity: atLimit ? 0.6 : 1,
                  }}
                  onMouseEnter={e => !atLimit && (e.currentTarget.style.background = 'var(--color-bg-elevated, #16161F)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => toggleMonitor(g.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(124,58,237,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: 'var(--color-accent-primary, #7C3AED)',
                    }}>
                      {(g.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary, #F1F0FF)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name || 'Sem nome'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)' }}>
                        {g.number_label || g.phone_number || ''}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={atLimit}
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '4px 12px',
                      borderRadius: 20, border: 'none', cursor: atLimit ? 'not-allowed' : 'pointer',
                      background: isOn ? 'rgba(16,185,129,0.15)' : 'var(--color-bg-elevated, #16161F)',
                      color: isOn ? 'var(--color-success, #10B981)' : 'var(--color-text-muted, #4A4A6A)',
                      outline: isOn ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--color-border, #2A2A3A)',
                    }}
                    onClick={e => { e.stopPropagation(); toggleMonitor(g.id) }}
                  >
                    {isOn ? 'Monitorar ✓' : atLimit ? 'Limite' : '+ Monitorar'}
                  </button>
                </div>
              )
            })}
          </div>

          <PaginationBar page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />

          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 8, marginTop: 16 }}
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Confirmar grupos →'}
          </button>
        </>
      )}

      <button
        onClick={onBack}
        style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)', display: 'block' }}
      >
        ← Voltar
      </button>
    </div>
  )
}

// ─── Step 4 — Team ────────────────────────────────────────────
function Step4Team({ chosenPlan, onFinish, onBack }) {
  const PAGE_SIZE = 15
  const [contacts, setContacts]   = useState([])
  const [search, setSearch]       = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [teamIds, setTeamIds]     = useState(new Set())
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)

  const fetchContacts = useCallback(async (pg, q) => {
    setLoading(true)
    try {
      const data = await contactsApi.list({ page: pg, limit: PAGE_SIZE, ...(q ? { search: q } : {}) })
      const list = data?.data || (Array.isArray(data) ? data : [])
      setContacts(list)
      setTotal(data?.meta?.total || list.length)
      setTeamIds(prev => {
        const next = new Set(prev)
        list.forEach(c => { if (c.is_team_member) next.add(c.id) })
        return next
      })
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts(page, search) }, [page, search, fetchContacts])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function toggleTeam(id) {
    setTeamIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      await Promise.all(
        contacts.map(c =>
          contactsApi.update(c.id, { is_team_member: teamIds.has(c.id) })
        )
      )
      // Persist plan and onboarding completion
      if (chosenPlan?.id) {
        await authApi.updateMe({ planId: chosenPlan.id, onboardingCompleted: true })
      } else {
        await authApi.updateMe({ onboardingCompleted: true })
      }
    } catch {}
    setSaving(false)
    onFinish()
  }

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
          Selecionar equipe
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #8B8BA7)' }}>
          Marque os contatos que fazem parte da sua equipe
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--color-text-muted, #4A4A6A)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input"
            type="text"
            placeholder="Buscar contato..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        <button className="btn" type="submit" style={{ flexShrink: 0, padding: '0 16px' }}>
          Buscar
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} className="animate-spin" color="var(--color-accent-primary, #7C3AED)" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 20 }}>
          <Users size={40} color="var(--color-text-muted, #4A4A6A)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
            {search ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)', marginBottom: 24 }}>
            {search ? 'Tente outro termo de busca.' : 'Os contatos aparecem após sincronizar um número WhatsApp.'}
          </p>
          <button className="btn btn-primary" onClick={handleConfirm} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 auto' }}>
            Ir para o dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 8, marginBottom: 8 }}>
            {contacts.map(c => {
              const inTeam = teamIds.has(c.id)
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated, #16161F)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => toggleTeam(c.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(124,58,237,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: 'var(--color-accent-primary, #7C3AED)',
                    }}>
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary, #F1F0FF)' }}>
                        {c.name || 'Sem nome'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)' }}>{c.phone_number || ''}</p>
                    </div>
                  </div>
                  <button
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '4px 12px',
                      borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: inTeam ? 'rgba(16,185,129,0.15)' : 'var(--color-bg-elevated, #16161F)',
                      color: inTeam ? 'var(--color-success, #10B981)' : 'var(--color-text-muted, #4A4A6A)',
                      outline: inTeam ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--color-border, #2A2A3A)',
                    }}
                    onClick={e => { e.stopPropagation(); toggleTeam(c.id) }}
                  >
                    {inTeam ? 'Equipe ✓' : '+ Equipe'}
                  </button>
                </div>
              )
            })}
          </div>

          <PaginationBar page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />

          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 8, marginTop: 16 }}
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Confirmar equipe'}
          </button>
        </>
      )}

      <button
        onClick={onBack}
        style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted, #4A4A6A)', display: 'block' }}
      >
        ← Voltar
      </button>
    </div>
  )
}

// ─── Step variants ────────────────────────────────────────────
const stepVariants = {
  enter:  (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:   (d) => ({ x: d > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.2 } }),
}

// ─── Main Onboarding Page ─────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [chosenPlan, setChosenPlan] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('gs_token')
    if (!token) { window.location.href = '/auth/register'; return }
    if (localStorage.getItem('gs_onboarding_done') === '1') {
      window.location.href = '/dashboard'
    }
  }, [])

  function goNext(plan) {
    if (plan) setChosenPlan(plan)
    setDirection(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStep(s => s - 1)
  }

  function finishOnboarding() {
    localStorage.setItem('gs_onboarding_done', '1')
    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary, #0A0A0F)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(124,58,237,0.2)',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} color="var(--color-accent-primary, #7C3AED)" fill="rgba(124,58,237,0.4)" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)' }}>Grupo do Zap</span>
      </div>

      <StepIndicator steps={['Plano', 'Conexão', 'Grupos', 'Equipe']} current={step} />

      {/* Animated step content */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            {step === 1 && <Step1PlanSelector onNext={goNext} />}
            {step === 2 && <Step2Connect onNext={goNext} onBack={goBack} />}
            {step === 3 && <Step3Groups chosenPlan={chosenPlan} onNext={goNext} onBack={goBack} />}
            {step === 4 && <Step4Team chosenPlan={chosenPlan} onFinish={finishOnboarding} onBack={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 48, fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)' }}>
        Precisa de ajuda?{' '}
        <a
          href="mailto:suporte@grupodozap.ai"
          style={{ color: 'var(--color-accent-primary, #7C3AED)', textDecoration: 'none' }}
        >
          Fale conosco
        </a>
      </p>
    </div>
  )
}
