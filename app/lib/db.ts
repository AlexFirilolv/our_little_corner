import { Pool, PoolClient } from 'pg'
import type {
  Locket,
  CreateLocket,
  UpdateLocket,
  LocketUser,
  CreateLocketUser,
  UpdateLocketUser,
  LocketInvite,
  CreateLocketInvite,
  UpdateLocketInvite,
  LocketAnalytics,
  CreateLocketAnalytics,
  SharedAccessToken,
  CreateSharedAccessToken,
  UpdateSharedAccessToken,
  MemoryGroup,
  CreateMemoryGroup,
  UpdateMemoryGroup,
  MediaItem,
  CreateMediaItem,
  UpdateMediaItem,
  Session,
  // Backwards compatibility aliases
  Corner,
  CreateCorner,
  UpdateCorner,
  CornerUser,
  CreateCornerUser,
  UpdateCornerUser,
  CornerInvite,
  CreateCornerInvite,
  UpdateCornerInvite,
} from './types'

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
  is_locked?: boolean
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

// Memory Group Functions

/**
 * Create a new memory group
 */
export async function createMemoryGroup(groupData: CreateMemoryGroup): Promise<MemoryGroup> {
  try {
    const result = await query(`
      INSERT INTO memory_groups (
        locket_id, title, description, is_locked, unlock_date, created_by_firebase_uid,
        lock_visibility, show_date_hint, show_image_preview, blur_percentage,
        unlock_hint, unlock_task, unlock_type, task_completed,
        show_title, show_description, show_media_count, show_creation_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      groupData.locket_id,
      groupData.title,
      groupData.description,
      groupData.is_locked || false,
      groupData.unlock_date,
      groupData.created_by_firebase_uid,
      groupData.lock_visibility || 'private',
      groupData.show_date_hint || false,
      groupData.show_image_preview || false,
      groupData.blur_percentage || 80,
      groupData.unlock_hint,
      groupData.unlock_task,
      groupData.unlock_type || 'scheduled',
      groupData.task_completed || false,
      groupData.show_title || false,
      groupData.show_description || false,
      groupData.show_media_count || false,
      groupData.show_creation_date || false
    ])

    return result.rows[0]
  } catch (error) {
    console.error('Error creating memory group:', error)
    throw new Error('Failed to create memory group')
  }
}

/**
 * Get all memory groups with their media items
 */
export async function getAllMemoryGroups(cornerId?: string, includeMedia = true, includeLocked = false): Promise<MemoryGroup[]> {
  try {
    // Build WHERE clause for locket and lock filtering
    const conditions = []

    const params = []
    let paramIndex = 1

    if (cornerId) {
      conditions.push(`mg.locket_id = $${paramIndex}`)
      params.push(cornerId)
      paramIndex++
    }

    if (!includeLocked) {
      conditions.push(`(
        (mg.is_locked = FALSE) 
        OR (mg.is_locked = TRUE AND mg.lock_visibility = 'public')
        OR (mg.unlock_date IS NOT NULL AND mg.unlock_date <= NOW())
      )`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    if (includeMedia) {
      const result = await query(`
        SELECT 
          mg.*,
          lu.display_name as creator_name,
          lu.avatar_url as creator_avatar_url,
          json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'original_name', m.original_name,
              'storage_key', m.storage_key,
              'storage_url', m.storage_url,
              'file_type', m.file_type,
              'file_size', m.file_size,
              'width', m.width,
              'height', m.height,
              'duration', m.duration,
              'title', m.title,
              'note', m.note,
              'date_taken', m.date_taken,
              'sort_order', m.sort_order,
              'created_at', m.created_at,
              'updated_at', m.updated_at
            ) ORDER BY m.sort_order, m.created_at
          ) FILTER (WHERE m.id IS NOT NULL) as media_items,
          COUNT(m.id)::integer as media_count
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
        LEFT JOIN locket_users lu ON mg.locket_id = lu.locket_id AND mg.created_by_firebase_uid = lu.firebase_uid
        ${whereClause}
        GROUP BY mg.id, lu.id
        ORDER BY mg.created_at DESC
      `, params)
      return result.rows
    } else {
      const result = await query(`
        SELECT 
          mg.*, 
          lu.display_name as creator_name,
          lu.avatar_url as creator_avatar_url,
          COUNT(m.id)::integer as media_count
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
        LEFT JOIN locket_users lu ON mg.locket_id = lu.locket_id AND mg.created_by_firebase_uid = lu.firebase_uid
        ${whereClause}
        GROUP BY mg.id, lu.id
        ORDER BY mg.created_at DESC
      `, params)
      return result.rows
    }
  } catch (error) {
    console.error('Error fetching memory groups:', error)
    throw new Error('Failed to fetch memory groups')
  }
}

/**
 * Get memory group by ID
 */
export async function getMemoryGroupById(id: string, includeMedia = true): Promise<MemoryGroup | null> {
  try {
    if (includeMedia) {
      const result = await query(`
        SELECT 
          mg.*,
          json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'original_name', m.original_name,
              'storage_key', m.storage_key,
              'storage_url', m.storage_url,
              'file_type', m.file_type,
              'file_size', m.file_size,
              'width', m.width,
              'height', m.height,
              'duration', m.duration,
              'title', m.title,
              'note', m.note,
              'date_taken', m.date_taken,
              'sort_order', m.sort_order,
              'created_at', m.created_at,
              'updated_at', m.updated_at
            ) ORDER BY m.sort_order, m.created_at
          ) FILTER (WHERE m.id IS NOT NULL) as media_items
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
        WHERE mg.id = $1
        GROUP BY mg.id
      `, [id])
      return result.rows[0] || null
    } else {
      const result = await query(`
        SELECT * FROM memory_groups WHERE id = $1
      `, [id])
      return result.rows[0] || null
    }
  } catch (error) {
    console.error('Error fetching memory group:', error)
    throw new Error('Failed to fetch memory group')
  }
}

/**
 * Update memory group
 */
export async function updateMemoryGroup(id: string, updates: UpdateMemoryGroup): Promise<MemoryGroup | null> {
  try {
    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.title !== undefined) {
      setParts.push(`title = $${paramCount}`)
      values.push(updates.title)
      paramCount++
    }

    if (updates.description !== undefined) {
      setParts.push(`description = $${paramCount}`)
      values.push(updates.description)
      paramCount++
    }

    if (updates.is_locked !== undefined) {
      setParts.push(`is_locked = $${paramCount}`)
      values.push(updates.is_locked)
      paramCount++
    }

    if (updates.unlock_date !== undefined) {
      setParts.push(`unlock_date = $${paramCount}`)
      values.push(updates.unlock_date)
      paramCount++
    }

    if (updates.cover_media_id !== undefined) {
      setParts.push(`cover_media_id = $${paramCount}`)
      values.push(updates.cover_media_id)
      paramCount++
    }

    // Advanced locking features
    if (updates.lock_visibility !== undefined) {
      setParts.push(`lock_visibility = $${paramCount}`)
      values.push(updates.lock_visibility)
      paramCount++
    }

    if (updates.show_date_hint !== undefined) {
      setParts.push(`show_date_hint = $${paramCount}`)
      values.push(updates.show_date_hint)
      paramCount++
    }

    if (updates.show_image_preview !== undefined) {
      setParts.push(`show_image_preview = $${paramCount}`)
      values.push(updates.show_image_preview)
      paramCount++
    }

    if (updates.blur_percentage !== undefined) {
      setParts.push(`blur_percentage = $${paramCount}`)
      values.push(updates.blur_percentage)
      paramCount++
    }

    if (updates.unlock_hint !== undefined) {
      setParts.push(`unlock_hint = $${paramCount}`)
      values.push(updates.unlock_hint)
      paramCount++
    }

    if (updates.unlock_task !== undefined) {
      setParts.push(`unlock_task = $${paramCount}`)
      values.push(updates.unlock_task)
      paramCount++
    }

    if (updates.unlock_type !== undefined) {
      setParts.push(`unlock_type = $${paramCount}`)
      values.push(updates.unlock_type)
      paramCount++
    }

    if (updates.task_completed !== undefined) {
      setParts.push(`task_completed = $${paramCount}`)
      values.push(updates.task_completed)
      paramCount++
    }

    // Public visibility controls
    if (updates.show_title !== undefined) {
      setParts.push(`show_title = $${paramCount}`)
      values.push(updates.show_title)
      paramCount++
    }

    if (updates.show_description !== undefined) {
      setParts.push(`show_description = $${paramCount}`)
      values.push(updates.show_description)
      paramCount++
    }

    if (updates.show_media_count !== undefined) {
      setParts.push(`show_media_count = $${paramCount}`)
      values.push(updates.show_media_count)
      paramCount++
    }

    if (updates.show_creation_date !== undefined) {
      setParts.push(`show_creation_date = $${paramCount}`)
      values.push(updates.show_creation_date)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id)

    const result = await query(`
      UPDATE memory_groups 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    return result.rows[0] || null
  } catch (error) {
    console.error('Error updating memory group:', error)
    throw new Error('Failed to update memory group')
  }
}

/**
 * Delete memory group (and all associated media)
 */
export async function deleteMemoryGroup(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM memory_groups 
      WHERE id = $1
      RETURNING id
    `, [id])

    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting memory group:', error)
    throw new Error('Failed to delete memory group')
  }
}

// Media Item Functions

/**
 * Get all media items, sorted by creation date (newest first)
 */
export async function getAllMedia(cornerId?: string): Promise<MediaItem[]> {
  try {
    let query_text = `
      SELECT m.*, mg.title as memory_group_title 
      FROM media m
      LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
      ORDER BY m.created_at DESC
    `
    let values: any[] = []

    if (cornerId) {
      query_text = `
        SELECT m.*, mg.title as memory_group_title 
        FROM media m
        LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
        WHERE m.locket_id = $1
        ORDER BY m.created_at DESC
      `
      values = [cornerId]
    }

    const result = await query(query_text, values)
    return result.rows
  } catch (error) {
    console.error('Error fetching media:', error)
    throw new Error('Failed to fetch media items')
  }
}

/**
 * Get a single media item by ID
 */
export async function getMediaById(id: string, cornerId?: string): Promise<MediaItem | null> {
  try {
    let query_text = `
      SELECT m.*, mg.title as memory_group_title 
      FROM media m
      LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
      WHERE m.id = $1
    `
    let values = [id]

    if (cornerId) {
      query_text += ` AND m.locket_id = $2`
      values.push(cornerId)
    }

    const result = await query(query_text, values)
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching media by ID:', error)
    throw new Error('Failed to fetch media item')
  }
}

/**
 * Create a new media item
 */
export async function createMediaItem(mediaData: CreateMediaItem): Promise<MediaItem> {
  try {
    const result = await query(`
      INSERT INTO media (
        locket_id, memory_group_id, filename, original_name, storage_key, storage_url, file_type, file_size,
        width, height, duration, title, note, date_taken, sort_order, uploaded_by_firebase_uid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      mediaData.locket_id,
      mediaData.memory_group_id,
      mediaData.filename,
      mediaData.original_name,
      mediaData.storage_key,
      mediaData.storage_url,
      mediaData.file_type,
      mediaData.file_size,
      mediaData.width,
      mediaData.height,
      mediaData.duration,
      mediaData.title,
      mediaData.note,
      mediaData.date_taken,
      mediaData.sort_order || 0,
      mediaData.uploaded_by_firebase_uid,
    ])

    return result.rows[0]
  } catch (error) {
    console.error('Error creating media item:', error)
    throw new Error('Failed to create media item')
  }
}

/**
 * Update a media item (title, note, date_taken, sort_order, and file replacement fields)
 */
export async function updateMediaItem(id: string, updates: UpdateMediaItem): Promise<MediaItem | null> {
  try {
    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.title !== undefined) {
      setParts.push(`title = $${paramCount}`)
      values.push(updates.title)
      paramCount++
    }

    if (updates.note !== undefined) {
      setParts.push(`note = $${paramCount}`)
      values.push(updates.note)
      paramCount++
    }

    if (updates.date_taken !== undefined) {
      setParts.push(`date_taken = $${paramCount}`)
      values.push(updates.date_taken)
      paramCount++
    }

    if (updates.sort_order !== undefined) {
      setParts.push(`sort_order = $${paramCount}`)
      values.push(updates.sort_order)
      paramCount++
    }

    // File replacement fields
    if (updates.filename !== undefined) {
      setParts.push(`filename = $${paramCount}`)
      values.push(updates.filename)
      paramCount++
    }
    if (updates.original_name !== undefined) {
      setParts.push(`original_name = $${paramCount}`)
      values.push(updates.original_name)
      paramCount++
    }
    if (updates.storage_key !== undefined) {
      setParts.push(`storage_key = $${paramCount}`)
      values.push(updates.storage_key)
      paramCount++
    }
    if (updates.storage_url !== undefined) {
      setParts.push(`storage_url = $${paramCount}`)
      values.push(updates.storage_url)
      paramCount++
    }
    if (updates.file_type !== undefined) {
      setParts.push(`file_type = $${paramCount}`)
      values.push(updates.file_type)
      paramCount++
    }
    if (updates.file_size !== undefined) {
      setParts.push(`file_size = $${paramCount}`)
      values.push(updates.file_size)
      paramCount++
    }
    if (updates.width !== undefined) {
      setParts.push(`width = $${paramCount}`)
      values.push(updates.width)
      paramCount++
    }
    if (updates.height !== undefined) {
      setParts.push(`height = $${paramCount}`)
      values.push(updates.height)
      paramCount++
    }
    if (updates.duration !== undefined) {
      setParts.push(`duration = $${paramCount}`)
      values.push(updates.duration)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id) // Add ID as the last parameter

    const result = await query(`
      UPDATE media 
      SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    return result.rows[0] || null
  } catch (error) {
    console.error('Error updating media item:', error)
    throw new Error('Failed to update media item')
  }
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM media 
      WHERE id = $1
      RETURNING id
    `, [id])

    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting media item:', error)
    throw new Error('Failed to delete media item')
  }
}

/**
 * Get media items by file type (image or video)
 */
export async function getMediaByType(fileTypePrefix: string): Promise<MediaItem[]> {
  try {
    const result = await query(`
      SELECT * FROM media 
      WHERE file_type LIKE $1
      ORDER BY created_at DESC
    `, [`${fileTypePrefix}%`])

    return result.rows
  } catch (error) {
    console.error('Error fetching media by type:', error)
    throw new Error('Failed to fetch media items by type')
  }
}

/**
 * Search media items by title or note content
 */
export async function searchMedia(searchTerm: string): Promise<MediaItem[]> {
  try {
    const result = await query(`
      SELECT * FROM media 
      WHERE title ILIKE $1 OR note ILIKE $1
      ORDER BY created_at DESC
    `, [`%${searchTerm}%`])

    return result.rows
  } catch (error) {
    console.error('Error searching media:', error)
    throw new Error('Failed to search media items')
  }
}

// Session management functions

/**
 * Create a new session
 */
export async function createSession(sessionToken: string, expiresAt: Date): Promise<Session> {
  try {
    const result = await query(`
      INSERT INTO sessions (session_token, expires_at)
      VALUES ($1, $2)
      RETURNING *
    `, [sessionToken, expiresAt])

    return result.rows[0]
  } catch (error) {
    console.error('Error creating session:', error)
    throw new Error('Failed to create session')
  }
}

/**
 * Get a session by token
 */
export async function getSessionByToken(sessionToken: string): Promise<Session | null> {
  try {
    const result = await query(`
      SELECT * FROM sessions 
      WHERE session_token = $1 AND expires_at > NOW()
    `, [sessionToken])

    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching session:', error)
    throw new Error('Failed to fetch session')
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM sessions 
      WHERE session_token = $1
      RETURNING id
    `, [sessionToken])

    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting session:', error)
    throw new Error('Failed to delete session')
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await query(`
      DELETE FROM sessions 
      WHERE expires_at < NOW()
    `)

    return result.rowCount
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error)
    return 0
  }
}

/**
 * Get database health status
 */
// =============================================================================
// LOCKET MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Get all corners for a user
 */
export async function getUserLockets(firebaseUid: string): Promise<Corner[]> {
  try {
    const result = await query(`
      SELECT 
        c.*,
        cu.role as user_role,
        COUNT(DISTINCT cu2.id) as member_count,
        COUNT(DISTINCT m.id) as media_count
      FROM lockets c
      JOIN locket_users cu ON c.id = cu.locket_id
      LEFT JOIN locket_users cu2 ON c.id = cu2.locket_id
      LEFT JOIN media m ON c.id = m.locket_id
      WHERE cu.firebase_uid = $1
      GROUP BY c.id, cu.role
      ORDER BY c.created_at DESC
    `, [firebaseUid])

    return result.rows.map((row: any) => ({
      ...row,
      member_count: parseInt(row.member_count) || 0,
      media_count: parseInt(row.media_count) || 0,
      is_user_admin: row.user_role === 'admin'
    }))
  } catch (error) {
    console.error('Error getting user corners:', error)
    throw new Error('Failed to get user corners')
  }
}

/**
 * Get locket by ID with user permissions
 */
export async function getLocketById(id: string, firebaseUid?: string): Promise<Corner | null> {
  try {
    let query_text = `
      SELECT 
        c.*,
        COUNT(DISTINCT cu.id) as member_count,
        COUNT(DISTINCT m.id) as media_count
      FROM lockets c
      LEFT JOIN locket_users cu ON c.id = cu.locket_id
      LEFT JOIN media m ON c.id = m.locket_id
      WHERE c.id = $1
      GROUP BY c.id
    `
    let values = [id]

    if (firebaseUid) {
      query_text = `
        SELECT 
          c.*,
          cu.role as user_role,
          COUNT(DISTINCT cu2.id) as member_count,
          COUNT(DISTINCT m.id) as media_count
        FROM lockets c
        LEFT JOIN locket_users cu ON c.id = cu.locket_id AND cu.firebase_uid = $2
        LEFT JOIN locket_users cu2 ON c.id = cu2.locket_id
        LEFT JOIN media m ON c.id = m.locket_id
        WHERE c.id = $1
        GROUP BY c.id, cu.role
      `
      values = [id, firebaseUid]
    }

    const result = await query(query_text, values)

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      ...row,
      member_count: parseInt(row.member_count) || 0,
      media_count: parseInt(row.media_count) || 0,
      is_user_admin: row.user_role === 'admin'
    }
  } catch (error) {
    console.error('Error getting locket by ID:', error)
    throw new Error('Failed to get locket')
  }
}

/**
 * Get locket by slug (for public access)
 */
export async function getLocketBySlug(slug: string): Promise<Corner | null> {
  try {
    const result = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT cu.id) as member_count,
        COUNT(DISTINCT m.id) as media_count
      FROM lockets c
      LEFT JOIN locket_users cu ON c.id = cu.locket_id
      LEFT JOIN media m ON c.id = m.locket_id
      WHERE c.slug = $1
      GROUP BY c.id
    `, [slug])

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      ...row,
      member_count: parseInt(row.member_count) || 0,
      media_count: parseInt(row.media_count) || 0
    }
  } catch (error) {
    console.error('Error getting locket by slug:', error)
    throw new Error('Failed to get locket')
  }
}

/**
 * Create a new locket
 */
export async function createLocket(data: CreateCorner): Promise<Corner> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Generate unique slug and invite code
    const slug = await generateLocketSlug(data.name, client)
    const inviteCode = await generateInviteCode(client)

    // Create the locket
    const locketResult = await client.query(`
      INSERT INTO lockets (name, description, slug, invite_code, is_public, share_password, admin_firebase_uid)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.name,
      data.description || null,
      slug,
      inviteCode,
      data.is_public || false,
      data.share_password || null,
      data.admin_firebase_uid
    ])

    const locket = locketResult.rows[0]

    // Add the admin as a locket user
    await client.query(`
      INSERT INTO locket_users (locket_id, firebase_uid, role, can_upload, can_edit_others_media, can_manage_locket)
      VALUES ($1, $2, 'admin', true, true, true)
    `, [locket.id, data.admin_firebase_uid])

    await client.query('COMMIT')

    return {
      ...locket,
      member_count: 1,
      media_count: 0,
      user_role: 'admin',
      is_user_admin: true
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating locket:', error)
    throw new Error('Failed to create locket')
  } finally {
    client.release()
  }
}

/**
 * Update locket
 */
export async function updateLocket(id: string, updates: UpdateCorner, firebaseUid: string): Promise<Corner> {
  try {
    // First check if user has permission
    const permission = await query(`
      SELECT cu.role 
      FROM locket_users cu 
      WHERE cu.locket_id = $1 AND cu.firebase_uid = $2 AND cu.can_manage_locket = true
    `, [id, firebaseUid])

    if (permission.rows.length === 0) {
      throw new Error('Permission denied')
    }

    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.name !== undefined) {
      setParts.push(`name = $${paramCount}`)
      values.push(updates.name)
      paramCount++
    }

    if (updates.description !== undefined) {
      setParts.push(`description = $${paramCount}`)
      values.push(updates.description)
      paramCount++
    }

    if (updates.is_public !== undefined) {
      setParts.push(`is_public = $${paramCount}`)
      values.push(updates.is_public)
      paramCount++
    }

    if (updates.share_password !== undefined) {
      setParts.push(`share_password = $${paramCount}`)
      values.push(updates.share_password)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid updates provided')
    }

    setParts.push(`updated_at = NOW()`)
    values.push(id)

    const result = await query(`
      UPDATE lockets 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      throw new Error('Locket not found')
    }

    return result.rows[0]
  } catch (error) {
    console.error('Error updating locket:', error)
    throw error
  }
}

/**
 * Delete locket (admin only)
 */
export async function deleteLocket(id: string, firebaseUid: string): Promise<void> {
  try {
    // Check if user is admin
    const permission = await query(`
      SELECT c.admin_firebase_uid 
      FROM lockets c 
      WHERE c.id = $1 AND c.admin_firebase_uid = $2
    `, [id, firebaseUid])

    if (permission.rows.length === 0) {
      throw new Error('Permission denied - only locket admin can delete')
    }

    const result = await query('DELETE FROM lockets WHERE id = $1', [id])

    if (result.rowCount === 0) {
      throw new Error('Locket not found')
    }
  } catch (error) {
    console.error('Error deleting locket:', error)
    throw error
  }
}

// =============================================================================
// LOCKET USER FUNCTIONS
// =============================================================================

/**
 * Get users in a locket
 */
export async function getLocketUsers(cornerId: string): Promise<CornerUser[]> {
  try {
    const result = await query(`
      SELECT cu.*, c.name as corner_name
      FROM locket_users cu
      LEFT JOIN lockets c ON cu.locket_id = c.id
      WHERE cu.locket_id = $1
      ORDER BY cu.role DESC, cu.joined_at ASC
    `, [cornerId])

    return result.rows
  } catch (error) {
    console.error('Error getting locket users:', error)
    throw new Error('Failed to get locket users')
  }
}

/**
 * Add user to locket
 */
export async function addUserToLocket(data: CreateCornerUser): Promise<CornerUser> {
  try {
    const result = await query(`
      INSERT INTO locket_users (
        locket_id, firebase_uid, display_name, email, avatar_url, 
        role, can_upload, can_edit_others_media, can_manage_locket
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.locket_id,
      data.firebase_uid,
      data.display_name || null,
      data.email || null,
      data.avatar_url || null,
      data.role || 'participant',
      data.can_upload !== false,
      data.can_edit_others_media || false,
      data.can_manage_locket || false
    ])

    return result.rows[0]
  } catch (error) {
    console.error('Error adding user to locket:', error)
    if (error instanceof Error && 'code' in error && (error as any).code === '23505') { // unique constraint violation
      throw new Error('User is already a member of this locket')
    }
    throw new Error('Failed to add user to locket')
  }
}

/**
 * Update locket user permissions
 */
export async function updateLocketUser(
  cornerId: string,
  userId: string,
  updates: UpdateCornerUser,
  requestingUserUid: string
): Promise<CornerUser> {
  try {
    // Check if requesting user has permission
    const permission = await query(`
      SELECT cu.role, cu.can_manage_locket
      FROM locket_users cu 
      WHERE cu.locket_id = $1 AND cu.firebase_uid = $2
    `, [cornerId, requestingUserUid])

    if (permission.rows.length === 0 || !permission.rows[0].can_manage_locket) {
      throw new Error('Permission denied')
    }

    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.role !== undefined) {
      setParts.push(`role = $${paramCount}`)
      values.push(updates.role)
      paramCount++
    }

    if (updates.can_upload !== undefined) {
      setParts.push(`can_upload = $${paramCount}`)
      values.push(updates.can_upload)
      paramCount++
    }

    if (updates.can_edit_others_media !== undefined) {
      setParts.push(`can_edit_others_media = $${paramCount}`)
      values.push(updates.can_edit_others_media)
      paramCount++
    }

    if (updates.can_manage_locket !== undefined) {
      setParts.push(`can_manage_locket = $${paramCount}`)
      values.push(updates.can_manage_locket)
      paramCount++
    }

    if (updates.display_name !== undefined) {
      setParts.push(`display_name = $${paramCount}`)
      values.push(updates.display_name)
      paramCount++
    }

    if (updates.avatar_url !== undefined) {
      setParts.push(`avatar_url = $${paramCount}`)
      values.push(updates.avatar_url)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid updates provided')
    }

    values.push(cornerId, userId)

    const result = await query(`
      UPDATE locket_users 
      SET ${setParts.join(', ')}, last_active_at = NOW()
      WHERE locket_id = $${paramCount} AND firebase_uid = $${paramCount + 1}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      throw new Error('Locket user not found')
    }

    return result.rows[0]
  } catch (error) {
    console.error('Error updating locket user:', error)
    throw error
  }
}

/**
 * Update user role in locket
 */
export async function updateUserRole(
  cornerId: string,
  userId: string,
  role: 'admin' | 'participant'
): Promise<CornerUser> {
  try {
    const result = await query(`
      UPDATE locket_users 
      SET role = $3, last_active_at = NOW()
      WHERE locket_id = $1 AND id = $2
      RETURNING *
    `, [cornerId, userId, role])

    if (result.rows.length === 0) {
      throw new Error('Locket user not found')
    }

    return result.rows[0]
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

/**
 * Remove user from locket
 */
export async function removeUserFromLocket(
  cornerId: string,
  userId: string,
  requestingUserUid?: string
): Promise<boolean> {
  try {
    // Check permissions
    const permission = await query(`
      SELECT 
        c.admin_firebase_uid,
        cu.can_manage_locket
      FROM lockets c
      LEFT JOIN locket_users cu ON c.id = cu.locket_id AND cu.firebase_uid = $2
      WHERE c.id = $1
    `, [cornerId, requestingUserUid])

    if (permission.rows.length === 0) {
      throw new Error('Locket not found')
    }

    const { admin_firebase_uid, can_manage_locket } = permission.rows[0]

    // Can't remove the admin
    if (userId === admin_firebase_uid) {
      throw new Error('Cannot remove locket admin')
    }

    // Check if user has permission (admin or can_manage_locket, or removing themselves)
    if (requestingUserUid !== admin_firebase_uid &&
      !can_manage_locket &&
      requestingUserUid !== userId) {
      throw new Error('Permission denied')
    }

    const result = await query(`
      DELETE FROM locket_users 
      WHERE locket_id = $1 AND id = $2
    `, [cornerId, userId])

    return result.rowCount > 0
  } catch (error) {
    console.error('Error removing user from locket:', error)
    return false
  }
}

// =============================================================================
// LOCKET INVITES
// =============================================================================

/**
 * Get all invites for a locket
 */
export async function getLocketInvites(cornerId: string): Promise<CornerInvite[]> {
  try {
    const result = await query(`
      SELECT 
        ci.*,
        cu.display_name as invited_by_name,
        cu.email as invited_by_email
      FROM locket_invites ci
      LEFT JOIN locket_users cu ON ci.invited_by_firebase_uid = cu.firebase_uid
      WHERE ci.locket_id = $1
      ORDER BY ci.created_at DESC
    `, [cornerId])

    return result.rows
  } catch (error) {
    console.error('Error fetching locket invites:', error)
    throw new Error('Failed to get locket invites')
  }
}

/**
 * Create a locket invite
 */
export async function createLocketInvite(data: CreateCornerInvite): Promise<CornerInvite> {
  try {
    // Check if user is already a member or has pending invite
    const existingInvite = await query(`
      SELECT id FROM locket_invites 
      WHERE locket_id = $1 AND email = $2 AND status IN ('pending', 'accepted')
    `, [data.locket_id, data.email])

    const existingMember = await query(`
      SELECT id FROM locket_users 
      WHERE locket_id = $1 AND email = $2
    `, [data.locket_id, data.email])

    if (existingInvite.rows.length > 0 || existingMember.rows.length > 0) {
      throw new Error('User already invited or is already a member')
    }

    // Generate unique invite token
    const crypto = require('crypto')
    const inviteToken = crypto.randomBytes(32).toString('hex')

    const result = await query(`
      INSERT INTO locket_invites (
        locket_id, email, role, can_upload, can_edit_others_media, status, invite_token,
        invited_by_firebase_uid, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.locket_id,
      data.email,
      data.role,
      data.can_upload !== false,
      data.can_edit_others_media || false,
      'pending',
      inviteToken,
      data.invited_by_firebase_uid,
      data.expires_at
    ])

    return result.rows[0]
  } catch (error) {
    console.error('Error creating locket invite:', error)
    throw error
  }
}

/**
 * Get invite by token
 */
export async function getCornerInviteByToken(token: string): Promise<CornerInvite | null> {
  try {
    const result = await query(`
      SELECT ci.*, c.name as corner_name
      FROM locket_invites ci
      JOIN lockets c ON ci.locket_id = c.id
      WHERE ci.invite_token = $1 AND ci.status = 'pending' AND ci.expires_at > NOW()
    `, [token])

    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching invite by token:', error)
    return null
  }
}


/**
 * Revoke a locket invite
 */
export async function revokeCornerInvite(inviteId: string, firebaseUid: string): Promise<void> {
  try {
    const result = await query(`
      UPDATE locket_invites 
      SET status = 'revoked'
      WHERE id = $1 AND invited_by_firebase_uid = $2
    `, [inviteId, firebaseUid])

    if (result.rowCount === 0) {
      throw new Error('Invite not found or permission denied')
    }
  } catch (error) {
    console.error('Error revoking locket invite:', error)
    throw error
  }
}

/**
 * Get invite by locket invite code and email (public access)
 */
export async function getInviteByCodeAndEmail(inviteCode: string, email: string): Promise<CornerInvite & { locket?: any }> {
  try {
    const result = await query(`
      SELECT 
        ci.*,
        c.name as corner_name,
        c.description as corner_description
      FROM locket_invites ci
      JOIN lockets c ON ci.locket_id = c.id
      WHERE c.invite_code = $1 AND ci.email = $2 AND ci.status = 'pending'
      ORDER BY ci.created_at DESC
      LIMIT 1
    `, [inviteCode, email])

    if (result.rows.length === 0) {
      throw new Error('Invite not found')
    }

    const invite = result.rows[0]
    return {
      ...invite,
      locket: {
        id: invite.locket_id,
        name: invite.corner_name,
        description: invite.corner_description
      }
    }
  } catch (error) {
    console.error('Error getting invite by code and email:', error)
    throw error
  }
}

/**
 * Accept locket invite
 */
export async function acceptCornerInvite(
  inviteId: string,
  firebaseUid: string,
  email: string,
  displayName: string
): Promise<CornerUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get the invite
    const inviteResult = await client.query(`
      SELECT ci.*, c.id as locket_id
      FROM locket_invites ci
      JOIN lockets c ON ci.locket_id = c.id
      WHERE ci.id = $1 AND ci.status = 'pending'
    `, [inviteId])

    if (inviteResult.rows.length === 0) {
      throw new Error('Invite not found or already processed')
    }

    const invite = inviteResult.rows[0]

    // Check if email matches
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Permission denied - email mismatch')
    }

    // Check if user is already a member
    const existingUser = await client.query(`
      SELECT id FROM locket_users 
      WHERE locket_id = $1 AND firebase_uid = $2
    `, [invite.locket_id, firebaseUid])

    if (existingUser.rows.length > 0) {
      // Mark invite as accepted and return existing user
      await client.query(`
        UPDATE locket_invites 
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1
      `, [inviteId])

      await client.query('COMMIT')
      return existingUser.rows[0]
    }

    // Add user to locket
    const userResult = await client.query(`
      INSERT INTO locket_users (
        locket_id, firebase_uid, display_name, email, 
        role, can_upload, can_edit_others_media, can_manage_locket
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      invite.locket_id,
      firebaseUid,
      displayName,
      email,
      invite.role,
      invite.can_upload,
      invite.can_edit_others_media,
      invite.role === 'admin' // Admins can manage locket
    ])

    // Mark invite as accepted
    await client.query(`
      UPDATE locket_invites 
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [inviteId])

    await client.query('COMMIT')
    return userResult.rows[0]

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error accepting locket invite:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get pending invites for a user by email
 */
export async function getPendingInvitesForEmail(email: string): Promise<CornerInvite[]> {
  try {
    const result = await query(`
      SELECT 
        ci.*,
        c.name as corner_name,
        c.description as corner_description,
        cu.display_name as invited_by_name
      FROM locket_invites ci
      JOIN lockets c ON ci.locket_id = c.id
      LEFT JOIN locket_users cu ON ci.invited_by_firebase_uid = cu.firebase_uid AND cu.locket_id = ci.locket_id
      WHERE ci.email = $1 AND ci.status = 'pending' AND ci.expires_at > NOW()
      ORDER BY ci.created_at DESC
    `, [email.toLowerCase()])

    return result.rows.map((row: any) => ({
      ...row,
      locket: {
        id: row.locket_id,
        name: row.corner_name,
        description: row.corner_description
      }
    }))
  } catch (error) {
    console.error('Error getting pending invites for email:', error)
    throw error
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique locket slug
 */
async function generateLocketSlug(name: string, client?: PoolClient): Promise<string> {
  const db = client || pool

  // Generate base slug from name
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')

  if (!baseSlug) baseSlug = 'locket'

  // Check for uniqueness and add counter if needed
  let finalSlug = baseSlug
  let counter = 0

  while (true) {
    const result = await db.query('SELECT id FROM lockets WHERE slug = $1', [finalSlug])
    if (result.rows.length === 0) break

    counter++
    finalSlug = `${baseSlug}-${counter}`
  }

  return finalSlug
}

/**
 * Generate unique invite code
 */
async function generateInviteCode(client?: PoolClient): Promise<string> {
  const db = client || pool

  while (true) {
    // Generate 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    const result = await db.query('SELECT id FROM lockets WHERE invite_code = $1', [code])
    if (result.rows.length === 0) return code
  }
}

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

// =============================================================================
// BACKWARDS COMPATIBILITY ALIASES (Corner → Locket)
// =============================================================================

// Invite function aliases
export const revokeLocketInvite = revokeCornerInvite
export const acceptLocketInvite = acceptCornerInvite
export const getInviteByLocketCodeAndEmail = getInviteByCodeAndEmail

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end()
})

process.on('SIGTERM', () => {
  pool.end()
})