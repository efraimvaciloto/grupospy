import sql from '../db/connection.js'
import { authenticate } from '../middleware/auth.js'
import * as uazapi from '../services/uazapi.js'

export default async function contactRoutes(fastify) {

  fastify.addHook('onRequest', authenticate)

  // GET /contacts
  fastify.get('/contacts', async (req) => {
    const { page = 1, limit = 50, search, tags } = req.query
    const offset = (page - 1) * limit

    const rows = await sql`
      SELECT * FROM contacts
      WHERE tenant_id = ${req.tenantId}
        ${search ? sql`AND (name ILIKE ${'%' + search + '%'} OR phone_number ILIKE ${'%' + search + '%'})` : sql``}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    const [{ count }] = await sql`SELECT COUNT(*) FROM contacts WHERE tenant_id = ${req.tenantId}`
    return { data: rows, meta: { total: parseInt(count) } }
  })

  // POST /contacts
  fastify.post('/contacts', async (req, reply) => {
    const { name, phoneNumber, email, tags, notes } = req.body
    const [contact] = await sql`
      INSERT INTO contacts (tenant_id, name, phone_number, email, tags, notes, imported_from)
      VALUES (${req.tenantId}, ${name}, ${phoneNumber}, ${email || null},
              ${tags || []}, ${notes || null}, 'manual')
      ON CONFLICT (tenant_id, phone_number) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email,
        tags = EXCLUDED.tags, updated_at = now()
      RETURNING *
    `
    return reply.status(201).send(contact)
  })

  // POST /contacts/import — importar CSV (array de objetos)
  fastify.post('/contacts/import', async (req, reply) => {
    const { contacts } = req.body // [{ name, phoneNumber, email, tags }]
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return reply.status(400).send({ error: 'Nenhum contato fornecido' })
    }

    let imported = 0
    for (const c of contacts) {
      if (!c.phoneNumber) continue
      await sql`
        INSERT INTO contacts (tenant_id, name, phone_number, email, tags, imported_from)
        VALUES (${req.tenantId}, ${c.name || c.phoneNumber}, ${c.phoneNumber},
                ${c.email || null}, ${c.tags || []}, 'csv')
        ON CONFLICT (tenant_id, phone_number) DO NOTHING
      `
      imported++
    }
    return { imported }
  })

  // PATCH /contacts/:id
  fastify.patch('/contacts/:id', async (req, reply) => {
    const { name, email, tags, notes, customFields, is_team_member } = req.body
    const [contact] = await sql`
      UPDATE contacts SET
        name            = COALESCE(${name || null}, name),
        email           = COALESCE(${email || null}, email),
        tags            = COALESCE(${tags || null}::text[], tags),
        notes           = COALESCE(${notes || null}, notes),
        custom_fields   = COALESCE(${customFields ? JSON.stringify(customFields) : null}::jsonb, custom_fields),
        is_team_member  = COALESCE(${is_team_member ?? null}, is_team_member),
        updated_at      = now()
      WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}
      RETURNING *
    `
    if (!contact) return reply.status(404).send({ error: 'Not found' })
    return contact
  })

  // DELETE /contacts/:id
  fastify.delete('/contacts/:id', async (req) => {
    await sql`DELETE FROM contacts WHERE id = ${req.params.id} AND tenant_id = ${req.tenantId}`
    return { success: true }
  })

  // POST /contacts/validate — verificar quais têm WhatsApp
  fastify.post('/contacts/validate', async (req, reply) => {
    const { waNumberId, phoneNumbers } = req.body

    const [number] = await sql`
      SELECT uazapi_token FROM wa_numbers WHERE id = ${waNumberId} AND tenant_id = ${req.tenantId}
    `
    if (!number) return reply.status(404).send({ error: 'Number not found' })

    const result = await uazapi.checkNumbers(number.uazapiToken, phoneNumbers)
    const validPhones = (Array.isArray(result) ? result : [])
      .filter(r => r.exists).map(r => r.number)

    // Atualizar wa_valid no banco
    for (const phone of phoneNumbers) {
      await sql`
        UPDATE contacts SET
          wa_valid = ${validPhones.includes(phone)},
          wa_checked_at = now()
        WHERE tenant_id = ${req.tenantId} AND phone_number = ${phone}
      `
    }

    return { valid: validPhones, total: phoneNumbers.length, validCount: validPhones.length }
  })
}
