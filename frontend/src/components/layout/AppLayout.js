'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { auth } from '../../lib/api'

function TrialBanner({ tenant }) {
  if (!tenant?.subscriptionStatus || tenant.subscriptionStatus !== 'trial') return null
  if (!tenant?.trialEndsAt) return null

  const daysLeft = Math.ceil((new Date(tenant.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
  if (daysLeft > 3) return null

  const expired = daysLeft <= 0
  const bg = expired ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.10)'
  const border = expired ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'
  const color = expired ? '#EF4444' : '#F59E0B'
  const msg = expired
    ? 'Seu período de teste expirou.'
    : `Seu trial expira em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}.`

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 0,
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontSize: 13,
      color,
      fontWeight: 500,
    }}>
      <span>{msg}</span>
      <a
        href="/billing/upgrade"
        style={{
          background: color,
          color: '#fff',
          padding: '3px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Ativar plano
      </a>
    </div>
  )
}

function GroupLimitBanner({ tenant, usage }) {
  if (!tenant || !usage) return null
  const maxGroups = tenant.maxGroups
  if (maxGroups === -1) return null // Business: unlimited
  const effectiveLimit = maxGroups + (tenant.extraGroupsPurchased || 0)
  const monitored = usage.groupsMonitored || 0
  if (monitored < effectiveLimit) return null

  const extraPrice = maxGroups > 0
    ? ((tenant.priceCents || 0) / maxGroups / 100).toFixed(2).replace('.', ',')
    : '0,00'

  return (
    <div style={{
      background: 'rgba(124,58,237,0.08)',
      borderBottom: '1px solid rgba(124,58,237,0.2)',
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      fontSize: 12,
      color: 'var(--color-text-secondary, #8B8BA7)',
    }}>
      <span>Você usa <strong style={{ color: 'var(--color-text-primary, #F1F0FF)' }}>{monitored}/{effectiveLimit}</strong> grupos monitorados.</span>
      <a
        href="/billing/upgrade"
        style={{
          color: 'var(--color-accent-primary, #7C3AED)',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: 12,
        }}
      >
        + Comprar grupos (R${extraPrice}/grupo)
      </a>
    </div>
  )
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tenant, setTenant] = useState(null)
  const [usage, setUsage] = useState(null)

  const sidebarWidth = collapsed ? 72 : 240

  useEffect(() => {
    // Load tenant from localStorage first (fast)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gs_tenant')
      if (stored) {
        try { setTenant(JSON.parse(stored)) } catch {}
      }
      const storedUsage = localStorage.getItem('gs_usage')
      if (storedUsage) {
        try { setUsage(JSON.parse(storedUsage)) } catch {}
      }
    }

    // Then refresh from API
    auth.me().then(data => {
      if (data) {
        localStorage.setItem('gs_tenant', JSON.stringify(data.tenant))
        localStorage.setItem('gs_usage', JSON.stringify(data.usage))
        setTenant(data.tenant)
        setUsage(data.usage)
      }
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-primary)', flexDirection: 'column' }}>
      {/* Trial banner */}
      <TrialBanner tenant={tenant} />
      {/* Group limit banner */}
      <GroupLimitBanner tenant={tenant} usage={usage} />

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 40,
              display: 'none',
            }}
            className="mobile-overlay"
          />
        )}

        {/* Sidebar wrapper */}
        <div
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 300ms ease',
            position: 'relative',
            zIndex: 50,
          }}
          className="sidebar-wrapper"
        >
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
        </div>

        {/* Main content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Topbar — sticky at the top of the main column */}
          <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <Topbar onMenuToggle={() => setMobileOpen((o) => !o)} />
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-primary)' }}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile sidebar styles injected inline via style tag trick — using a style element */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-wrapper {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
            transition: transform 300ms ease, width 300ms ease !important;
          }
          .sidebar-wrapper.mobile-open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
