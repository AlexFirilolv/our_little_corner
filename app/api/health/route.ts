import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return NextResponse.json({ status: 'healthy', database: 'connected' }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', database: 'disconnected', error: (error as Error).message },
      { status: 503 }
    );
  }
}