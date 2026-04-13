export * from './client'
export * from './memory-groups'
export * from './media'
export * from './sessions'
export * from './lockets'
export * from './locket-users'
export * from './locket-invites'
export * from './memory-comments'
export * from './memory-likes'
export * from './locket-covers'
export * from './spotlight'
export * from './pinned-memory'

// graceful shutdown
import { pool } from './client'
process.on('SIGINT', () => { pool.end() })
process.on('SIGTERM', () => { pool.end() })
