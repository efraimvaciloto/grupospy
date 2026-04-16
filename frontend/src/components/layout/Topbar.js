'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, ChevronRight, ArrowLeft, Menu, X, User, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../lib/ThemeContext'

// Map route segments to human-readable labels
const ROUTE_LABELS = {
  dashboard:   'Dashboard',
  groups:      'Grupos',
  contacts:    'Contatos',
  connections: 'Conexões',
  broadcasts:  'Disparos',
  tasks:       'Tarefas',
  settings:    'Configurações',
  auth:        'Autenticação',
  profile:     'Perfil',
}

function buildBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, idx) => ({
    label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + segments.slice(0, idx + 1).join('/'),
  }))
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

export default function Topbar({ onMenuToggle }) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hasNotification, setHasNotification] = useState(true)

  const { theme, setTheme } = useTheme()

  const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'system' }
  const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }
  const THEME_LABELS = { system: 'Sistema', light: 'Claro', dark: 'Escuro' }

  function cycleTheme() {
    setTheme(THEME_CYCLE[theme])
  }

  const ThemeIcon = THEME_ICONS[theme] || Monitor

  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gs_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function logout() {
    localStorage.removeItem('gs_token')
    localStorage.removeItem('gs_tenant')
    localStorage.removeItem('gs_user')
    window.location.href = '/auth/login'
  }

  const breadcrumb = buildBreadcrumb(pathname)
  const isSubRoute = breadcrumb.length > 1
  const displayName = user?.name || user?.email || 'Usuário'

  return (
    <header
      style={{
        height: 56,
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="mobile-menu-btn"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          padding: 6,
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        <Menu size={18} />
      </button>

      {/* Back button — shown on sub-routes */}
      {isSubRoute && (
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 6,
            flexShrink: 0,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.background = 'none'
          }}
        >
          <ArrowLeft size={14} />
          Voltar
        </button>
      )}

      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
        aria-label="Breadcrumb"
      >
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
          Home
        </span>
        {breadcrumb.map((crumb, idx) => (
          <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: idx === breadcrumb.length - 1 ? 1 : 0, minWidth: 0 }}>
            <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            {idx === breadcrumb.length - 1 ? (
              <span
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {crumb.label}
              </span>
            ) : (
              <a
                href={crumb.href}
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: searchOpen ? 200 : 0,
              overflow: 'hidden',
              transition: 'width 250ms ease',
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false)
                  setSearchValue('')
                }
              }}
              style={{
                width: '100%',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '5px 10px',
                color: 'var(--color-text-primary)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={() => {
              if (searchOpen && searchValue) setSearchValue('')
              setSearchOpen((o) => !o)
            }}
            title={searchOpen ? 'Fechar busca' : 'Buscar'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              borderRadius: 8,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary)'
              e.currentTarget.style.background = 'none'
            }}
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
        </div>

        {/* Notifications */}
        <button
          title="Notificacoes"
          onClick={() => setHasNotification(false)}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            borderRadius: 8,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.background = 'none'
          }}
        >
          <Bell size={16} />
          {hasNotification && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                background: 'var(--color-danger)',
                borderRadius: '50%',
                border: '1.5px solid var(--color-bg-secondary)',
              }}
            />
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Tema: ${THEME_LABELS[theme]} (clique para alternar)`}
          className="theme-toggle-btn"
        >
          <ThemeIcon size={16} />
        </button>

        {/* User avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            title={displayName}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              transition: 'box-shadow 0.15s',
              boxShadow: dropdownOpen ? '0 0 0 2px var(--color-accent-primary)' : 'none',
            }}
          >
            {getInitials(displayName)}
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 180,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '6px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 100,
              }}
            >
              {/* User info header */}
              <div
                style={{
                  padding: '8px 10px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {displayName}
                </div>
                {user?.email && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                )}
              </div>

              <DropdownItem icon={User} label="Perfil" href="/profile" onClick={() => setDropdownOpen(false)} />
              <DropdownItem icon={Settings} label="Configuracoes" href="/settings" onClick={() => setDropdownOpen(false)} />

              <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0' }} />

              <DropdownItem
                icon={LogOut}
                label="Sair"
                danger
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  )
}

function DropdownItem({ icon: Icon, label, href, onClick, danger = false }) {
  const [hovered, setHovered] = useState(false)

  const content = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 500,
        color: danger
          ? (hovered ? 'var(--color-danger)' : 'var(--color-text-secondary)')
          : (hovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'),
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        textDecoration: 'none',
        width: '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </span>
  )

  if (href) {
    return <a href={href} style={{ display: 'block', textDecoration: 'none' }}>{content}</a>
  }

  return <div style={{ display: 'block' }}>{content}</div>
}
