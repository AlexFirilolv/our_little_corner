import { Pool } from 'pg'

// Create a connection pool for better performance
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Disable SSL for localhost development
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1') || process.env.DATABASE_URL?.includes('db:5432') || process.env.DATABASE_URL?.includes('postgres') ? false : { rejectUnauthorized: false },
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
})


// Filtering and sorting types
export interface MediaFilters {
  file_type?: string
  date_from?: Date
  date_to?: Date
  search_term?: string
}

export interface SortOptions {
  field: 'created_at' | 'date_taken' | 'title' | 'file_size' | 'file_type'
  direction: 'asc' | 'desc'
}

export type ViewMode = 'gallery' | 'list' | 'icons' | 'columns' | 'timeline'

/**
 * Execute a query with the connection pool with retry logic
 */
export async function query(text: string, params?: any[], retries = 5): Promise<any> {
  let lastError: any;
  let delay = 500; // Starting delay in ms

  for (let i = 0; i < retries; i++) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(text, params);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`Database query failed (attempt ${i + 1}/${retries}). Error:`, err);
      console.warn(`Retrying in ${delay}ms...`);

      // If it's not a connection error, don't retry
      if (err instanceof Error && !err.message.includes('connect') && !err.message.includes('terminated')) {
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    } finally {
      if (client) client.release();
    }
  }

  console.error('Database query failed after maximum retries');
  throw lastError;
}

/**
 * Wait for database to be ready (useful during startup)
 */
export async function waitForDB(maxAttempts = 10): Promise<void> {
  console.log('Waiting for database to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await query('SELECT 1');
      console.log('✓ Database is ready');
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${i + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Database failed to become ready');
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<{ status: string; timestamp: Date }> {
  try {
    const result = await query('SELECT NOW() as timestamp')
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    throw new Error('Database is unhealthy')
  }
}
