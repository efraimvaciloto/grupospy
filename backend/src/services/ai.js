import Anthropic from '@anthropic-ai/sdk'
import sql from '../db/connection.js'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[AI] ANTHROPIC_API_KEY não configurada — funcionalidades de IA estarão indisponíveis')
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'missing' })
const MODEL  = process.env.AI_MODEL || 'claude-haiku-4-5-20251001'

function sanitizeJSON(raw) {
  let text = raw.trim()
  if (text.startsWith('```json')) text = text.slice(7)
  else if (text.startsWith('```')) text = text.slice(3)
  if (text.endsWith('```')) text = text.slice(0, -3)
  return text.trim()
}

// ─── Resumo Diário ────────────────────────────────────────────

export async function generateDailySummary(groupId, date) {
  const [group] = await sql`SELECT * FROM groups WHERE id = ${groupId}`
  if (!group) throw new Error('Group not found')

  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : date
  const startTs = new Date(`${dateStr}T00:00:00Z`)
  const endTs   = new Date(`${dateStr}T23:59:59Z`)

  const messages = await sql`
    SELECT sender_name, sender_phone, message_type, body, sent_at
    FROM messages
    WHERE group_id = ${groupId}
      AND sent_at BETWEEN ${startTs} AND ${endTs}
      AND body IS NOT NULL
      AND is_group = true
    ORDER BY sent_at ASC
    LIMIT 500
  `

  if (messages.length === 0) return null

  const uniqueSenders = new Set(messages.map(m => m.senderJid)).size
  const formatted = messages.map(m => {
    const time = new Date(m.sentAt).toTimeString().slice(0, 5)
    const type = m.messageType !== 'conversation' ? `[${m.messageType}] ` : ''
    const name = m.senderName || m.senderPhone || 'Desconhecido'
    return `${time} ${name}: ${type}${m.body}`
  }).join('\n')

  const prompt = `Analise as mensagens do grupo WhatsApp "${group.name}" do dia ${dateStr}.
Total: ${messages.length} mensagens | Participantes únicos: ${uniqueSenders}

MENSAGENS:
${formatted.slice(0, 12000)}

Retorne SOMENTE JSON válido (sem markdown, sem backticks) com esta estrutura exata:
{
  "summary_text": "Resumo narrativo de 3-5 linhas em português sobre o que aconteceu no grupo",
  "topics": ["tópico1", "tópico2", "tópico3"],
  "heat_score": 75,
  "tasks": [
    {"text": "descrição clara da tarefa identificada", "urgency": "high"}
  ],
  "key_messages": [
    {"sender": "nome", "text": "resumo da mensagem", "reason": "por que é importante"}
  ],
  "sentiment": {
    "overall": "positive",
    "score": 0.65,
    "positive_pct": 60,
    "neutral_pct": 30,
    "negative_pct": 10
  }
}`

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada. Configure a variável de ambiente para usar IA.')
  }

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    throw new Error(`Falha na chamada à API Anthropic: ${err.message}`)
  }

  const raw = response.content[0].text.trim()
  let result
  try {
    result = JSON.parse(sanitizeJSON(raw))
  } catch (err) {
    throw new Error(`Resposta da IA não é JSON válido: ${raw.slice(0, 200)}`)
  }

  // Upsert summary
  const [summary] = await sql`
    INSERT INTO ai_summaries (
      tenant_id, group_id, date, period, summary_text, topics, tasks,
      key_messages, heat_score, sentiment, sentiment_score, tokens_used, model_used
    ) VALUES (
      ${group.tenantId}, ${groupId}, ${dateStr}, 'daily',
      ${result.summary_text}, ${result.topics}, ${JSON.stringify(result.tasks)},
      ${JSON.stringify(result.key_messages)}, ${result.heat_score},
      ${result.sentiment?.overall}, ${result.sentiment?.score},
      ${response.usage.input_tokens + response.usage.output_tokens}, ${MODEL}
    )
    ON CONFLICT (group_id, date, period)
    DO UPDATE SET
      summary_text  = EXCLUDED.summary_text,
      topics        = EXCLUDED.topics,
      tasks         = EXCLUDED.tasks,
      key_messages  = EXCLUDED.key_messages,
      heat_score    = EXCLUDED.heat_score,
      sentiment     = EXCLUDED.sentiment,
      sentiment_score = EXCLUDED.sentiment_score,
      tokens_used   = EXCLUDED.tokens_used,
      generated_at  = now()
    RETURNING *
  `

  // Salvar tasks
  for (const task of (result.tasks || [])) {
    await sql`
      INSERT INTO ai_tasks (tenant_id, group_id, summary_id, title, urgency)
      VALUES (${group.tenantId}, ${groupId}, ${summary.id}, ${task.text}, ${task.urgency || 'medium'})
    `
  }

  // Log de uso
  const costUsd = (response.usage.input_tokens * 0.00000025) + (response.usage.output_tokens * 0.00000125)
  await sql`
    INSERT INTO ai_usage_log (tenant_id, operation, group_id, tokens_in, tokens_out, cost_usd, model)
    VALUES (${group.tenantId}, 'daily_summary', ${groupId},
            ${response.usage.input_tokens}, ${response.usage.output_tokens},
            ${costUsd.toFixed(6)}, ${MODEL})
  `

  return summary
}

// ─── Análise de Sentimento em Lote ───────────────────────────

export async function batchSentimentAnalysis(groupId, limit = 50) {
  const messages = await sql`
    SELECT id, body FROM messages
    WHERE group_id = ${groupId}
      AND ai_processed = false
      AND body IS NOT NULL
      AND length(body) > 3
    ORDER BY sent_at DESC
    LIMIT ${limit}
  `

  if (messages.length === 0) return 0

  const texts = messages.map(m => `ID:${m.id}|${m.body.slice(0, 200)}`).join('\n')

  const prompt = `Para cada mensagem abaixo, classifique o sentimento.
Retorne SOMENTE JSON válido (sem markdown) no formato:
{"results": [{"id": "uuid", "sentiment": "positive|neutral|negative", "score": 0.0}]}

Mensagens:
${texts}`

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error(`[AI] Erro na análise de sentimento: ${err.message}`)
    return 0
  }

  let results
  try {
    const parsed = JSON.parse(sanitizeJSON(response.content[0].text.trim()))
    results = parsed.results
  } catch {
    console.error('[AI] Resposta de sentimento não é JSON válido')
    return 0
  }

  // Atualizar em batch
  for (const r of results) {
    await sql`
      UPDATE messages SET
        sentiment       = ${r.sentiment},
        sentiment_score = ${r.score},
        ai_processed    = true
      WHERE id = ${r.id}
    `
  }

  return results.length
}

// ─── Calcular Heat Score ──────────────────────────────────────

export async function calculateHeatScore(groupId, date) {
  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : date
  const startTs = new Date(`${dateStr}T00:00:00Z`)
  const endTs   = new Date(`${dateStr}T23:59:59Z`)

  const [stats] = await sql`
    SELECT
      COUNT(*)                                      AS message_count,
      COUNT(DISTINCT sender_phone)                  AS unique_senders,
      COUNT(*) FILTER (WHERE file_url IS NOT NULL)  AS media_count,
      AVG(sentiment_score) FILTER (WHERE sentiment_score IS NOT NULL) AS avg_sentiment
    FROM messages
    WHERE group_id = ${groupId}
      AND sent_at BETWEEN ${startTs} AND ${endTs}
  `

  // Histórico dos últimos 30 dias para normalização
  const [hist] = await sql`
    SELECT
      AVG(message_count)  AS avg_msgs,
      AVG(unique_senders) AS avg_senders
    FROM group_daily_scores
    WHERE group_id = ${groupId}
      AND date >= CURRENT_DATE - INTERVAL '30 days'
  `

  const avgMsgs    = parseFloat(hist?.avgMsgs) || 10
  const avgSenders = parseFloat(hist?.avgSenders) || 3

  const msgCount    = parseInt(stats.messageCount)
  const senders     = parseInt(stats.uniqueSenders)
  const mediaCount  = parseInt(stats.mediaCount)
  const sentiment   = parseFloat(stats.avgSentiment) || 0

  const msgNorm     = Math.min(msgCount / (avgMsgs * 2), 1) * 40
  const senderNorm  = Math.min(senders / (avgSenders * 2), 1) * 30
  const mediaNorm   = Math.min(mediaCount / 10, 1) * 10
  const sentimentW  = ((sentiment + 1) / 2) * 20

  const heatScore = Math.round(msgNorm + senderNorm + mediaNorm + sentimentW)

  const [sentimentStats] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE sentiment = 'positive') * 100.0 / NULLIF(COUNT(*),0) AS pos_pct,
      COUNT(*) FILTER (WHERE sentiment = 'neutral')  * 100.0 / NULLIF(COUNT(*),0) AS neu_pct,
      COUNT(*) FILTER (WHERE sentiment = 'negative') * 100.0 / NULLIF(COUNT(*),0) AS neg_pct
    FROM messages
    WHERE group_id = ${groupId}
      AND sent_at BETWEEN ${startTs} AND ${endTs}
      AND sentiment IS NOT NULL
  `

  await sql`
    INSERT INTO group_daily_scores (
      group_id, tenant_id, date, message_count, unique_senders, media_count,
      heat_score, sentiment_score, sentiment_pos, sentiment_neu, sentiment_neg
    )
    SELECT ${groupId}, tenant_id, ${dateStr}::date,
           ${msgCount}, ${senders}, ${mediaCount},
           ${heatScore}, ${sentiment.toFixed(4)},
           ${sentimentStats?.posPct || 0}, ${sentimentStats?.neuPct || 0}, ${sentimentStats?.negPct || 0}
    FROM groups WHERE id = ${groupId}
    ON CONFLICT (group_id, date) DO UPDATE SET
      message_count  = EXCLUDED.message_count,
      unique_senders = EXCLUDED.unique_senders,
      media_count    = EXCLUDED.media_count,
      heat_score     = EXCLUDED.heat_score,
      sentiment_score = EXCLUDED.sentiment_score,
      sentiment_pos  = EXCLUDED.sentiment_pos,
      sentiment_neu  = EXCLUDED.sentiment_neu,
      sentiment_neg  = EXCLUDED.sentiment_neg
  `

  return heatScore
}
