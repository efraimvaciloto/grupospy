'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Contact,
  Wifi,
  Megaphone,
  CheckSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Image from 'next/image'

const mainNav = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/groups',      icon: Users,           label: 'Grupos' },
  { href: '/contacts',    icon: Contact,         label: 'Contatos' },
  { href: '/connections', icon: Wifi,            label: 'Conexões' },
  { href: '/broadcasts',  icon: Megaphone,       label: 'Disparos' },
  { href: '/tasks',       icon: CheckSquare,     label: 'Tarefas' },
]

const bottomNav = [
  { href: '/settings', icon: Settings, label: 'Configurações' },
]

export default function Sidebar({ collapsed = false, onToggle }) {
  const path = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gs_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
  }, [])

  function logout() {
    localStorage.removeItem('gs_token')
    localStorage.removeItem('gs_tenant')
    localStorage.removeItem('gs_user')
    window.location.href = '/auth/login'
  }

  function getInitials(name) {
    if (!name) return 'U'
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }

  const displayName = user?.name || user?.email || 'Usuário'
  const displayRole = user?.role || 'Membro'

  return (
    <aside
      style={{
        width: collapsed ? 72 : 240,
        minHeight: '100vh',
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        flexShrink: 0,
        transition: 'width 300ms ease',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div
        style={{
          position: 'relative',
          height: 52,
          padding: '4px 20px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: 4,
          overflow: 'hidden',
        }}
      >
        {/* Favicon — visible only when collapsed */}
        <div
          style={{
            position: 'absolute',
            left: 20,
            opacity: collapsed ? 1 : 0,
            transform: collapsed ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: collapsed ? 'auto' : 'none',
          }}
        >
          <Image
            src="/favicon.png"
            alt="Grupo do Zap"
            width={32}
            height={32}
            style={{ borderRadius: 8, objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Logo text — visible only when expanded */}
        <div
          style={{
            position: 'absolute',
            left: 20,
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? 'scale(0.8)' : 'scale(1)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            pointerEvents: collapsed ? 'none' : 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          <Image
            src="/logo.png"
            alt="Grupo do Zap"
            width={120}
            height={28}
            style={{ objectFit: 'contain', objectPosition: 'left', display: 'block' }}
          />
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
        {mainNav.map(({ href, icon: Icon, label }) => {
          const isActive = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-bg-elevated)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span
                style={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : 'auto',
                  overflow: 'hidden',
                  transition: 'opacity 200ms ease, width 300ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {/* Separator */}
        <div
          style={{
            height: 1,
            background: 'var(--color-border)',
            margin: '8px 4px',
            flexShrink: 0,
          }}
        />

        {/* Bottom nav items */}
        {bottomNav.map(({ href, icon: Icon, label }) => {
          const isActive = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-bg-elevated)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span
                style={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : 'auto',
                  overflow: 'hidden',
                  transition: 'opacity 200ms ease, width 300ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: user info + collapse toggle */}
      <div
        style={{
          padding: '12px 8px 4px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* User row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {getInitials(displayName)}
          </div>

          {/* Name + role */}
          <div
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
              overflow: 'hidden',
              transition: 'opacity 200ms ease, width 300ms ease',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayRole}
            </div>
          </div>

          {/* Logout — only visible when expanded */}
          {!collapsed && (
            <button
              onClick={logout}
              title="Sair"
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 6,
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            transition: 'color 0.15s, background 0.15s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-elevated)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <span style={{ fontSize: 11 }}>Recolher</span>
              <ChevronLeft size={16} />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
