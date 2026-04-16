'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AppLayout from '../../components/layout/AppLayout'
import { analytics } from '../../lib/api'
import { useRealtime } from '../../hooks/useRealtime'
import { staggerChildren, slideInUp } from '../../lib/animations'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import {
  MessageSquare, AlertTriangle, Zap, CheckSquare,
  Flame, TrendingUp, ThermometerSun, Snowflake,
  Users, Activity, TrendingDown
} from 'lucide-react'

/* ── HeatBadge ─────────────────────────────────────────────────────────── */
function HeatBadge({ score }) {
  if (score >= 81) return (
    <span className="badge badge-danger" style={{ gap: 4 }}>
      <Flame size={10} /> {score}
    </span>
  )
  if (score >= 61) return (
    <span className="badge badge-warning" style={{ gap: 4 }}>
      <TrendingUp size={10} /> {score}
    </span>
  )
  if (score >= 31) return (
    <span className="badge badge-info" style={{ gap: 4 }}>
      <Activity size={10} /> {score}
    </span>
  )
  return (
    <span className="badge badge-neutral" style={{ gap: 4 }}>
      <Snowflake size={10} /> {score}
    </span>
  )
}

/* ── KpiCard ────────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  const trendPositive = trend !== undefined && trend >= 0

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 20px var(--color-accent-glow)' }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        cursor: 'default',
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        flexShrink: 0,
        background: `${color}26`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: 'var(--color-text-primary)' }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11, color, marginTop: 3 }}>{sub}</div>
        )}
      </div>

      {/* Trend badge */}
      {trend !== undefined && (
        <span
          className={trendPositive ? 'badge badge-success' : 'badge badge-danger'}
          style={{ gap: 3, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}
        >
          {trendPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {Math.abs(trend)}%
        </span>
      )}
    </motion.div>
  )
}

/* ── Loading skeleton ───────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        <div className="skeleton" style={{ height: 28, width: 160, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: 260, borderRadius: 6, marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
        </div>
        <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
      </div>
    </AppLayout>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const tenant = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_tenant') || '{}') : {}

  const usage = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_usage') || '{}') : {}
  const maxGroups = tenant?.maxGroups === -1 ? null : (tenant?.maxGroups || null)
  const monitored = data?.totals?.monitoredGroups ?? 0
  const groupsUsagePct = maxGroups ? Math.round((monitored / maxGroups) * 100) : 0
  const groupsAtLimit = maxGroups && monitored >= maxGroups
  const groupsNearLimit = maxGroups && groupsUsagePct >= 80 && !groupsAtLimit

  const load = useCallback(async () => {
    try {
      const d = await analytics.dashboard()
      setData(d)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime(tenant?.id, {
    'group:message': () => load(),
    'group:alert':   () => load(),
    'group:updated': () => load(),
  })

  if (loading) return <LoadingSkeleton />

  const heatSeries = data?.heatMap
    ? Object.entries(data.heatMap).flatMap(([day, hours]) =>
        Object.entries(hours).map(([h, count]) => ({
          label: `${day} ${h}h`, count,
        }))
      ).slice(-48)
    : []

  const msgChange = data?.messages?.change
  const kpiCards = [
    {
      icon: MessageSquare,
      label: 'Grupos monitorados',
      value: maxGroups ? `${monitored}/${maxGroups}` : monitored,
      sub: groupsAtLimit
        ? 'Limite atingido — compre mais grupos'
        : groupsNearLimit
          ? `${groupsUsagePct}% do limite usado`
          : `${data?.totals?.activeToday ?? 0} ativos hoje`,
      color: groupsAtLimit || groupsNearLimit
        ? '#F59E0B'
        : 'var(--color-accent-primary)',
    },
    {
      icon: AlertTriangle,
      label: 'Sem resposta',
      value: data?.totals?.noResponseGroups ?? 0,
      sub: 'Mais de 24h',
      color: 'var(--color-warning)',
    },
    {
      icon: Zap,
      label: 'Mensagens hoje',
      value: data?.messages?.today ?? 0,
      sub: msgChange !== undefined
        ? `${msgChange >= 0 ? '+' : ''}${msgChange}% vs ontem`
        : undefined,
      color: 'var(--color-accent-primary)',
      trend: msgChange,
    },
    {
      icon: CheckSquare,
      label: 'Tarefas abertas',
      value: data?.pendingTasks ?? 0,
      sub: 'Identificadas pela IA',
      color: 'var(--color-info)',
    },
  ]

  return (
    <AppLayout>
      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Visao geral da atividade dos seus grupos
          </p>
        </div>

        {/* KPI Cards */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="kpi-grid" style={{ gap: 16, marginBottom: 24 }}
        >
          {kpiCards.map((card, i) => (
            <motion.div key={i} variants={slideInUp}>
              <KpiCard {...card} />
            </motion.div>
          ))}
        </motion.div>

        {/* Top grupos + Alertas */}
        <div className="dashboard-grid-2" style={{ gap: 16, marginBottom: 24 }}>

          {/* Top Grupos */}
          <div className="card">
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-text-primary)',
            }}>
              <Flame size={14} color="var(--color-warning)" />
              Top Grupos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.topGroups || []).map((g, i) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    color: 'var(--color-text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 18,
                    flexShrink: 0,
                    textAlign: 'right',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <Users size={9} />
                      {g.memberCount ?? 0} membros · {g.messagesToday} msgs hoje
                    </div>
                  </div>
                  <HeatBadge score={Math.round(g.heatScore || 0)} />
                </div>
              ))}
              {!data?.topGroups?.length && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Nenhum grupo ativo hoje</p>
              )}
            </div>
          </div>

          {/* Alertas Abertos */}
          <div className="card">
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-text-primary)',
            }}>
              <AlertTriangle size={14} color="var(--color-danger)" />
              Alertas Abertos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.recentAlerts || []).map(a => (
                <div key={a.id} style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 8,
                  borderLeft: `3px solid ${a.severity === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {a.groupName}
                    </div>
                  </div>
                  <span className={`badge ${a.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
              {!data?.recentAlerts?.length && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Nenhum alerta no momento</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity chart */}
        <div className="card">
          <h3 style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-text-primary)',
          }}>
            <ThermometerSun size={14} color="var(--color-accent-primary)" />
            Atividade — Ultimas 48h
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={heatSeries} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                interval={5}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                itemStyle={{ color: 'var(--color-accent-primary)', fontSize: 12 }}
                cursor={{ fill: 'rgba(124,58,237,0.08)' }}
              />
              <Bar
                dataKey="count"
                fill="var(--color-accent-primary)"
                radius={[3, 3, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </AppLayout>
  )
}
