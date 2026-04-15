'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { analytics } from '../../lib/api'
import { useRealtime } from '../../hooks/useRealtime'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import {
  MessageSquare, AlertTriangle, Zap, TrendingUp,
  CheckSquare, Flame, ThermometerSun, Snowflake, Users
} from 'lucide-react'

function HeatBadge({ score }) {
  if (score >= 81) return <span className="badge badge-red">🚀 {score}</span>
  if (score >= 61) return <span className="badge badge-yellow">🔥 {score}</span>
  if (score >= 31) return <span style={{ background: 'rgba(59,130,246,.15)', color: '#3b82f6' }} className="badge">🌡 {score}</span>
  return <span className="badge badge-gray">❄ {score}</span>
}

function StatCard({ icon: Icon, label, value, sub, color = 'var(--brand)' }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontFamily: 'Syne', fontWeight: 800 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Tenant do localStorage
  const tenant = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gs_tenant') || '{}') : {}

  const load = useCallback(async () => {
    try {
      const d = await analytics.dashboard()
      setData(d)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Tempo real: atualizar quando chegar nova mensagem
  useRealtime(tenant?.id, {
    'group:message': () => load(),
    'group:alert':   () => load(),
    'group:updated': () => load(),
  })

  if (loading) return (
    <AppLayout>
      <div style={{ padding: 32, color: 'var(--muted)' }}>Carregando...</div>
    </AppLayout>
  )

  // Formatar heatmap como série temporal
  const heatSeries = data?.heatMap
    ? Object.entries(data.heatMap).flatMap(([day, hours]) =>
        Object.entries(hours).map(([h, count]) => ({
          label: `${day} ${h}h`, count,
        }))
      ).slice(-48)
    : []

  return (
    <AppLayout>
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Visão geral da atividade dos seus grupos
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard
            icon={MessageSquare} label="Grupos monitorados"
            value={data?.totals?.monitoredGroups ?? 0}
            sub={`${data?.totals?.activeToday ?? 0} ativos hoje`}
          />
          <StatCard
            icon={AlertTriangle} label="Sem resposta" color="var(--warning)"
            value={data?.totals?.noResponseGroups ?? 0}
            sub="Mais de 24h"
          />
          <StatCard
            icon={Zap} label="Mensagens hoje"
            value={data?.messages?.today ?? 0}
            sub={data?.messages?.change >= 0
              ? `+${data?.messages?.change}% vs ontem`
              : `${data?.messages?.change}% vs ontem`}
          />
          <StatCard
            icon={CheckSquare} label="Tarefas abertas" color="var(--info)"
            value={data?.pendingTasks ?? 0}
            sub="Identificadas pela IA"
          />
        </div>

        {/* Linha 2: Top grupos + Alertas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Top grupos */}
          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={14} color="var(--warning)" /> Top Grupos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.topGroups || []).map((g, i) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12, width: 16 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {g.messagesToday} msgs hoje
                    </div>
                  </div>
                  <HeatBadge score={Math.round(g.heatScore || 0)} />
                </div>
              ))}
              {!data?.topGroups?.length && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum grupo ativo hoje</p>
              )}
            </div>
          </div>

          {/* Alertas recentes */}
          <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="var(--danger)" /> Alertas Abertos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.recentAlerts || []).map(a => (
                <div key={a.id} style={{
                  display: 'flex', gap: 10, padding: '10px 12px',
                  background: 'var(--hover)', borderRadius: 8,
                  borderLeft: `3px solid ${a.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{a.groupName}</div>
                  </div>
                  <span className={`badge ${a.severity === 'high' ? 'badge-red' : 'badge-yellow'}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
              {!data?.recentAlerts?.length && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum alerta no momento 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* Mapa de calor (atividade por hora) */}
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ThermometerSun size={14} color="var(--brand)" /> Atividade — Últimas 48h
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={heatSeries} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--muted)', fontSize: 11 }}
                itemStyle={{ color: 'var(--brand)', fontSize: 12 }}
              />
              <Bar dataKey="count" fill="var(--brand)" radius={[2, 2, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  )
}
