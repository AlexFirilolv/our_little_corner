import 'dotenv/config'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getTestPool, closeTestPool } from '../helpers/db'

// Load .env.test first, then .env.test.local overrides.
loadEnv({ path: '.env.test' })
loadEnv({ path: '.env.test.local', override: true })

export default async function globalSetup() {
  const pool = getTestPool()

  // Reset schema
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE')
  await pool.query('CREATE SCHEMA public')
  await pool.query('GRANT ALL ON SCHEMA public TO postgres')
  await pool.query('GRANT ALL ON SCHEMA public TO public')

  // Apply main schema
  const schemaPath = path.resolve('database/multi-tenant-schema.sql')
  await pool.query(readFileSync(schemaPath, 'utf8'))

  // Apply any migrations in order
  const migrationsDir = path.resolve('database/migrations')
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const f of files) {
      await pool.query(readFileSync(path.join(migrationsDir, f), 'utf8'))
    }
  }

  // Apply in-app runtime migrations defined in app/lib/migrations.ts
  const { migrations: appMigrations } = await import('../../app/lib/migrations')
  for (const m of appMigrations) {
    await pool.query(m.sql)
  }

  return async () => {
    await closeTestPool()
  }
}
