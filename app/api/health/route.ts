import { NextResponse } from 'next/server'
import { getDatabaseHealth } from '@/lib/db'

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  try {
    // Check database connectivity
    const dbHealth = await getDatabaseHealth()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    }, { status: 200 })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 })
  }
}