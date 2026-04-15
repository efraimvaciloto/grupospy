import sql from '../db/connection.js'
import { authenticate } from '../middleware/auth.js'

export default async function analyticsRoutes(fastify) {

  fastify.addHook('onRequest', authenticate)

  // GET /analytics/dashboard — métricas principais
  fastify.get('/analytics/dashboard', async (req) => {
    const tenantId = req.tenantId

    const [totals] = await sql`
      SELECT
        COUNT(*)                                                AS total_groups,
        COUNT(*) FILTER (WHERE is_monitored = true)            AS monitored_groups,
        COUNT(*) FILTER (WHERE last_message_at >= NOW() - INTERVAL '24h') AS active_today,
        COUNT(*) FILTER (
          WHERE last_message_at IS NOT NULL
            AND last_message_at > GREATEST(
              COALESCE(last_admin_msg_at, '1970-01-01'::timestamptz),
              COALESCE(last_team_msg_at, '1970-01-01'::timestamptz)
            )
            AND last_message_at < NOW() - INTERVAL '24h'
        ) AS no_response_groups
      FROM groups
      WHERE tenant_id = ${tenantId} AND is_archived = false
    `

    const brTz = 'America/Sao_Paulo'
    const [msgStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE sent_at >= (NOW() AT TIME ZONE ${brTz})::date)       AS messages_today,
        COUNT(*) FILTER (WHERE sent_at >= (NOW() AT TIME ZONE ${brTz})::date - 1
                           AND sent_at <  (NOW() AT TIME ZONE ${brTz})::date)       AS messages_yesterday
      FROM messages
      WHERE tenant_id = ${tenantId}
    `

    const topGroups = await sql`
      SELECT g.id, g.name, COUNT(m.id) AS messages_today,
             gds.heat_score
      FROM groups g
      LEFT JOIN messages m ON m.group_id = g.id AND m.sent_at >= CURRENT_DATE
      LEFT JOIN LATERAL (
        SELECT heat_score FROM group_daily_scores
        WHERE group_id = g.id ORDER BY date DESC LIMIT 1
      ) gds ON true
      WHERE g.tenant_id = ${tenantId} AND g.is_monitored = true
      GROUP BY g.id, g.name, gds.heat_score
      ORDER BY messages_today DESC
      LIMIT 5
    `

    const recentAlerts = await sql`
      SELECT a.*, g.name AS group_name
      FROM group_alerts a
      JOIN groups g ON g.id = a.group_id
      WHERE a.tenant_id = ${tenantId}
        AND a.resolved_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT 10
    `

    const pendingTasks = await sql`
      SELECT COUNT(*) FROM ai_tasks
      WHERE tenant_id = ${tenantId} AND status = 'open'
    `

    // Mapa de calor: mensagens por hora nos últimos 7 dias
    const heatMap = await sql`
      SELECT
        DATE(sent_at)                 AS day,
        EXTRACT(HOUR FROM sent_at)    AS hour,
        COUNT(*)                      AS count
      FROM messages
      WHERE tenant_id = ${tenantId}
        AND sent_at >= NOW() - INTERVAL '7 days'
      GROUP BY day, hour
      ORDER BY day, hour
    `

    return {
      totals: {
        totalGroups:       parseInt(totals.totalGroups),
        monitoredGroups:   parseInt(totals.monitoredGroups),
        activeToday:       parseInt(totals.activeToday),
        noResponseGroups:  parseInt(totals.noResponseGroups),
      },
      messages: {
        today:     parseInt(msgStats.messagesToday),
        yesterday: parseInt(msgStats.messagesYesterday),
        change:    msgStats.messagesYesterday > 0
          ? Math.round(((msgStats.messagesToday - msgStats.messagesYesterday) / msgStats.messagesYesterday) * 100)
          : 0,
      },
      topGroups,
      recentAlerts,
      pendingTasks: parseInt(pendingTasks[0].count),
      heatMap,
    }
  })

  // GET /analytics/groups/:id/heat — mapa de calor do grupo
  fastify.get('/analytics/groups/:id/heat', async (req) => {
    const { days = 30 } = req.query

    return sql`
      SELECT date, message_count, unique_senders, heat_score,
             sentiment_score, sentiment_pos, sentiment_neu, sentiment_neg
      FROM group_daily_scores
      WHERE group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
        AND date >= CURRENT_DATE - ${days}::integer
      ORDER BY date ASC
    `
  })

  // GET /analytics/groups/:id/sentiment — histórico de sentimento
  fastify.get('/analytics/groups/:id/sentiment', async (req) => {
    const { days = 14 } = req.query

    return sql`
      SELECT date, sentiment_pos, sentiment_neu, sentiment_neg, sentiment_score
      FROM group_daily_scores
      WHERE group_id = ${req.params.id}
        AND tenant_id = ${req.tenantId}
        AND date >= CURRENT_DATE - ${days}::integer
      ORDER BY date ASC
    `
  })

  // GET /tasks — tarefas IA pendentes
  fastify.get('/tasks', async (req) => {
    const { status = 'open', groupId } = req.query

    return sql`
      SELECT t.*, g.name AS group_name
      FROM ai_tasks t
      JOIN groups g ON g.id = t.group_id
      WHERE t.tenant_id = ${req.tenantId}
        AND t.status = ${status}
        ${groupId ? sql`AND t.group_id = ${groupId}` : sql``}
      ORDER BY
        CASE t.urgency WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
      LIMIT 100
    `
  })

  // POST /tasks — criar tarefa manual
  fastify.post('/tasks', async (req, reply) => {
    const { groupId, title, description, urgency = 'medium' } = req.body
    if (!groupId || !title) return reply.status(400).send({ error: 'groupId e title são obrigatórios' })

    const [task] = await sql`
      INSERT INTO ai_tasks (tenant_id, group_id, title, description, urgency)
      VALUES (${req.tenantId}, ${groupId}, ${title}, ${description || null}, ${urgency})
      RETURNING *
    `
    return reply.status(201).send(task)
  })

  // PATCH /tasks/:id
  fastify.patch('/tasks/:id', async (req, reply) => {
    const { status, assignedTo } = req.body
    const [task] = await sql`
      UPDATE ai_tasks SET
        status      = COALESCE(${status || null}, status),
        assigned_to = COALESCE(${assignedTo || null}::uuid, assigned_to),
        resolved_at = CASE WHEN ${status} = 'done' THEN now() ELSE resolved_at END,
        updated_at  = now()
      WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
      RETURNING *
    `
    if (!task) return reply.status(404).send({ error: 'Not found' })
    return task
  })
}
