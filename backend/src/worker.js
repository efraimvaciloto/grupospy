import { Worker } from 'bullmq'
import cron from 'node-cron'
import { redis } from './db/redis.js'
import { processWebhookEvent } from './services/webhookProcessor.js'
import { generateDailySummary, batchSentimentAnalysis, calculateHeatScore } from './services/ai.js'
import { syncGroupsForNumber } from './services/syncService.js'
import sql from './db/connection.js'
import * as uazapi from './services/uazapi.js'

console.log('⚙️  Grupo do Zap Worker iniciando...')

// ─── Worker: Webhook ──────────────────────────────────────────

new Worker('webhook-processor', async (job) => {
  const { waNumberId, eventType, payload } = job.data
  await processWebhookEvent(waNumberId, eventType, payload)
}, {
  connection: redis,
  concurrency: 10,
})

// ─── Worker: IA ───────────────────────────────────────────────

new Worker('ai-processor', async (job) => {
  const { type, groupId, tenantId } = job.data

  if (type === 'sentiment') {
    await batchSentimentAnalysis(groupId, 30)
  }

  if (type === 'summary') {
    const date = job.data.date || new Date().toISOString().slice(0, 10)
    await generateDailySummary(groupId, date)
    await calculateHeatScore(groupId, date)
  }
}, {
  connection: redis,
  concurrency: 3, // limitar chamadas à API de IA
})

// ─── Worker: Broadcast ────────────────────────────────────────

new Worker('broadcast-processor', async (job) => {
  const { broadcastId } = job.data
  // A execução real acontece na rota POST /broadcasts/:id/send
  // Este worker é para reprocessar broadcasts falhos
  console.log('Reprocessando broadcast:', broadcastId)
}, {
  connection: redis,
  concurrency: 2,
})

// ─────────────────────────────────────────────────────────────
// CRON JOBS
// ─────────────────────────────────────────────────────────────

// 07:00 diário — Gerar resumos diários com IA
cron.schedule('0 7 * * *', async () => {
  console.log('[CRON] Gerando resumos diários...')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().slice(0, 10)

  const groups = await sql`
    SELECT g.id, g.tenant_id FROM groups g
    JOIN wa_numbers w ON w.id = g.wa_number_id
    WHERE g.is_monitored = true
      AND w.status = 'connected'
      AND g.last_message_at >= ${yesterday}
  `

  for (const group of groups) {
    try {
      await generateDailySummary(group.id, date)
      await calculateHeatScore(group.id, date)
      await new Promise(r => setTimeout(r, 500)) // throttle
    } catch (err) {
      console.error(`[CRON] Erro no resumo do grupo ${group.id}:`, err.message)
    }
  }
  console.log(`[CRON] Resumos gerados para ${groups.length} grupos`)
}, { timezone: 'America/Sao_Paulo' })

// 00:00 diário — Calcular heat scores finais do dia
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Calculando heat scores...')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = yesterday.toISOString().slice(0, 10)

  const groups = await sql`
    SELECT id FROM groups WHERE is_monitored = true
  `
  for (const g of groups) {
    try {
      await calculateHeatScore(g.id, date)
    } catch {}
  }
})

// */5 min — Verificar grupos sem resposta (alerta)
cron.schedule('*/5 * * * *', async () => {
  const stale = await sql`
    SELECT g.id, g.tenant_id, g.name, w.label AS number_label
    FROM groups g
    JOIN wa_numbers w ON w.id = g.wa_number_id
    WHERE g.is_monitored = true
      AND g.last_message_at IS NOT NULL
      AND g.last_message_at > GREATEST(
        COALESCE(g.last_admin_msg_at, '1970-01-01'::timestamptz),
        COALESCE(g.last_team_msg_at, '1970-01-01'::timestamptz)
      )
      AND g.last_message_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM group_alerts a
        WHERE a.group_id = g.id
          AND a.type = 'no_response'
          AND a.resolved_at IS NULL
          AND a.created_at > NOW() - INTERVAL '24 hours'
      )
  `

  for (const g of stale) {
    await sql`
      INSERT INTO group_alerts (group_id, tenant_id, type, severity, title, description)
      VALUES (
        ${g.id}, ${g.tenantId}, 'no_response', 'medium',
        ${'Grupo sem resposta: ' + g.name},
        'Este grupo tem mensagens sem resposta há mais de 24 horas.'
      )
    `
    await sql`
      INSERT INTO notifications (tenant_id, type, title, body, link, metadata)
      VALUES (
        ${g.tenantId}, 'alert',
        ${'Grupo sem resposta: ' + g.name},
        'Há mensagens sem resposta há mais de 24h.',
        ${'/groups/' + g.id},
        ${JSON.stringify({ groupId: g.id })}
      )
    `
  }
})

// */10 min — Verificar status das instâncias uazapi
cron.schedule('*/10 * * * *', async () => {
  const numbers = await sql`
    SELECT id, uazapi_token, uazapi_instance_id, tenant_id, status
    FROM wa_numbers
    WHERE status IN ('connected', 'connecting')
  `

  for (const num of numbers) {
    try {
      const statusData = await uazapi.getInstanceStatus(num.uazapiToken)
      const newStatus = statusData.status === 'open' ? 'connected'
        : statusData.status === 'connecting' ? 'connecting'
        : 'disconnected'

      if (newStatus !== num.status) {
        await sql`
          UPDATE wa_numbers SET status = ${newStatus}, updated_at = now()
          WHERE id = ${num.id}
        `

        if (newStatus === 'disconnected') {
          await sql`
            INSERT INTO notifications (tenant_id, type, title, body, metadata)
            VALUES (
              ${num.tenantId}, 'connection_lost',
              'Número desconectado',
              ${'Um número WhatsApp foi desconectado. Reconecte para continuar monitorando.'},
              ${JSON.stringify({ waNumberId: num.id })}
            )
          `
        }
      }
    } catch {}
  }
})

// */1 min — Processar broadcasts agendados
cron.schedule('* * * * *', async () => {
  const due = await sql`
    SELECT b.*, w.uazapi_token FROM broadcasts b
    JOIN wa_numbers w ON w.id = b.wa_number_id
    WHERE b.status = 'scheduled'
      AND b.scheduled_at <= NOW()
  `

  for (const broadcast of due) {
    try {
      const targets = await sql`
        SELECT bt.*, g.name AS group_name FROM broadcast_targets bt
        LEFT JOIN groups g ON g.id = bt.group_id
        WHERE bt.broadcast_id = ${broadcast.id} AND bt.status = 'pending'
      `

      const messages = []
      for (const t of targets) {
        for (const msg of broadcast.messagesPayload) {
          messages.push({
            ...msg,
            number: t.waGroupJid,
            text: msg.text
              ?.replace(/\{\{nome_grupo\}\}/g, t.groupName || '')
              ?.replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR')),
          })
        }
      }

      const result = await uazapi.createAdvancedCampaign(broadcast.uazapiToken, {
        info: broadcast.name, delayMin: broadcast.delayMin,
        delayMax: broadcast.delayMax, messages, scheduledFor: 1,
      })

      await sql`
        UPDATE broadcasts SET status = 'sending',
          uazapi_folder_id = ${result.folder_id || result.id},
          sent_at = now(), updated_at = now()
        WHERE id = ${broadcast.id}
      `
    } catch (err) {
      await sql`UPDATE broadcasts SET status = 'failed', updated_at = now() WHERE id = ${broadcast.id}`
      console.error(`[CRON] Broadcast ${broadcast.id} falhou:`, err.message)
    }
  }
})

// */30 min — Sincronizar status de campanhas com uazapi
cron.schedule('*/30 * * * *', async () => {
  const active = await sql`
    SELECT b.*, w.uazapi_token FROM broadcasts b
    JOIN wa_numbers w ON w.id = b.wa_number_id
    WHERE b.status = 'sending' AND b.uazapi_folder_id IS NOT NULL
  `

  for (const b of active) {
    try {
      const folders = await uazapi.listCampaigns(b.uazapiToken)
      const folder  = (Array.isArray(folders) ? folders : [])
        .find(f => f.id === b.uazapiFolderId)

      if (folder) {
        await sql`
          UPDATE broadcasts SET
            total_sent     = ${folder.sent || 0},
            total_failed   = ${folder.failed || 0},
            total_canceled = ${folder.canceled || 0},
            status = CASE WHEN ${folder.status} = 'done' THEN 'sent' ELSE status END,
            updated_at = now()
          WHERE id = ${b.id}
        `
      }
    } catch {}
  }
})

// 09:00 toda segunda — Resumos semanais
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Gerando resumos semanais...')
  const groups = await sql`
    SELECT id FROM groups WHERE is_monitored = true
  `
  // Resumo semanal usa as msgs dos últimos 7 dias — implementação futura
  console.log(`[CRON] ${groups.length} grupos para resumo semanal`)
}, { timezone: 'America/Sao_Paulo' })

// A cada 2 horas — Re-sync de grupos para números conectados
cron.schedule('0 */2 * * *', async () => {
  const numbers = await sql`
    SELECT id, uazapi_token, uazapi_instance_id, tenant_id
    FROM wa_numbers
    WHERE status = 'connected'
  `
  for (const num of numbers) {
    try {
      await syncGroupsForNumber(num, num.tenantId, false)
    } catch (err) {
      console.error(`[CRON] Re-sync groups error for ${num.id}:`, err.message)
    }
  }
  console.log(`[CRON] Re-sync groups para ${numbers.length} números`)
})

// 02:00 diário — Limpeza de dados antigos
cron.schedule('0 2 * * *', async () => {
  await sql`DELETE FROM webhook_events WHERE processed = true AND received_at < NOW() - INTERVAL '7 days'`
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`
  console.log('[CRON] Limpeza concluída')
})

console.log('✅ Worker e cron jobs ativos')
