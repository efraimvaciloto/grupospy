'use client'
import { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, TrendingUp } from 'lucide-react'
import { extraGroups as extraGroupsApi } from '../../lib/api'

export default function UpsellModal({
  isOpen,
  onClose,
  pricePerGroupCents,
  currentLimit,
  currentUsage,
  planName,
  onPurchase,
}) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const totalCents = pricePerGroupCents * quantity
  const fmtPrice = (cents) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`

  function adjustQty(delta) {
    setQuantity(q => Math.max(1, Math.min(50, q + delta)))
  }

  async function handlePurchase() {
    setLoading(true)
    setError('')
    try {
      const result = await extraGroupsApi.purchase(quantity)
      // Update localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gs_tenant')
        if (stored) {
          try {
            const t = JSON.parse(stored)
            t.extraGroupsPurchased = (t.extraGroupsPurchased || 0) + quantity
            localStorage.setItem('gs_tenant', JSON.stringify(t))
          } catch {}
        }
        const storedUsage = localStorage.getItem('gs_usage')
        if (storedUsage) {
          try {
            const u = JSON.parse(storedUsage)
            localStorage.setItem('gs_usage', JSON.stringify(u))
          } catch {}
        }
      }
      setSuccess(true)
      if (onPurchase) onPurchase(result)
    } catch (err) {
      setError(err.message || 'Erro ao processar compra.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div style={{
        width: 440,
        background: 'var(--color-bg-secondary, #0F0F18)',
        border: '1px solid var(--color-border, #2A2A3A)',
        borderRadius: 16,
        padding: 28,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 4 }}>
              Adicionar grupos ao plano
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)' }}>
              Plano atual: <strong style={{ color: 'var(--color-text-secondary, #8B8BA7)' }}>{planName || 'Starter'}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-muted, #4A4A6A)' }}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={24} color="var(--color-success, #10B981)" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', marginBottom: 8 }}>
              {quantity} grupo{quantity > 1 ? 's' : ''} adicionado{quantity > 1 ? 's' : ''}!
            </h4>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)', marginBottom: 20 }}>
              Seu limite agora é <strong>{currentLimit + quantity}</strong> grupos monitorados.
            </p>
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
            >
              Continuar
            </button>
          </div>
        ) : (
          <>
            {/* Current usage */}
            <div style={{
              background: 'var(--color-bg-elevated, #16161F)',
              border: '1px solid var(--color-border, #2A2A3A)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)', marginBottom: 2 }}>Uso atual</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)' }}>
                  {currentUsage} / {currentLimit} grupos
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted, #4A4A6A)', marginBottom: 2 }}>Preço por grupo extra</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent-primary, #7C3AED)' }}>
                  {fmtPrice(pricePerGroupCents)}/mês
                </p>
              </div>
            </div>

            {/* Quantity selector */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary, #8B8BA7)', marginBottom: 10 }}>
                Quantos grupos extras?
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                <button
                  onClick={() => adjustQty(-1)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--color-border, #2A2A3A)',
                    background: 'var(--color-bg-elevated, #16161F)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-secondary, #8B8BA7)',
                  }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary, #F1F0FF)', minWidth: 40, textAlign: 'center' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => adjustQty(1)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.4)',
                    background: 'rgba(124,58,237,0.1)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-accent-primary, #7C3AED)',
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Price summary */}
            <div style={{
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} color="var(--color-accent-primary, #7C3AED)" />
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #8B8BA7)' }}>
                  Novo limite: <strong style={{ color: 'var(--color-text-primary, #F1F0FF)' }}>{currentLimit + quantity}</strong> grupos
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-primary, #7C3AED)' }}>
                  + {fmtPrice(totalCents)}/mês
                </span>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: 'var(--color-danger, #EF4444)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn"
                onClick={onClose}
                style={{ flex: 1, justifyContent: 'center', display: 'flex' }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePurchase}
                disabled={loading}
                style={{ flex: 2, justifyContent: 'center', display: 'flex', gap: 8 }}
              >
                {loading ? 'Processando...' : `Adicionar ${quantity} grupo${quantity > 1 ? 's' : ''} por ${fmtPrice(totalCents)}/mês`}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <a
                href="/billing/upgrade"
                style={{ fontSize: 12, color: 'var(--color-text-muted, #4A4A6A)', textDecoration: 'none' }}
              >
                Ver planos maiores →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
