import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: postgres.camel,
})

export default sql

// Helper para queries com tenant isolation
export function withTenant(tenantId) {
  return {
    async query(strings, ...values) {
      return sql.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`
        return tx(strings, ...values)
      })
    }
  }
}
