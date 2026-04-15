import { Pool } from 'pg'

export function assertTestDatabase(url: string): void {
  const match = /\/([^/?]+)(?:\?|$)/.exec(url)
  const dbName = match?.[1]
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run: DATABASE_URL must target a database ending in _test (got: ${dbName ?? 'none'}).`,
    )
  }
}

let pool: Pool | null = null

export function getTestPool(): Pool {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  assertTestDatabase(url)
  pool = new Pool({ connectionString: url, max: 5 })
  return pool
}

export async function query<T = any>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  return getTestPool().query(text, params) as any
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
