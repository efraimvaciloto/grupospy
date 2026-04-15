'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, Megaphone, CheckSquare,
  Smartphone, Users, Settings, LogOut, Zap
} from 'lucide-react'

const nav = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/groups',       icon: MessageSquare,   label: 'Conversas' },
  { href: '/broadcasts',   icon: Megaphone,       label: 'Disparos' },
  { href: '/tasks',        icon: CheckSquare,     label: 'Tarefas' },
  { href: '/connections',  icon: Smartphone,      label: 'Conexões' },
  { href: '/contacts',     icon: Users,           label: 'Contatos' },
]

export default function Sidebar() {
  const path = usePathname()

  function logout() {
    localStorage.removeItem('gs_token')
    localStorage.removeItem('gs_tenant')
    window.location.href = '/auth/login'
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '20px 12px', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="#000" fill="#000" />
        </div>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
          GrupoSpy
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${path.startsWith(href) ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Link href="/settings" className="nav-link">
          <Settings size={16} /> Configurações
        </Link>
        <button className="nav-link" onClick={logout} style={{ background: 'none', border: 'none', textAlign: 'left' }}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  )
}
