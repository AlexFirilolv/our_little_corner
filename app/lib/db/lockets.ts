import type { PoolClient } from 'pg'
import { query, pool } from './client'
import type { Locket, CreateLocket, UpdateLocket } from '../types'

export async function getUserLockets(firebaseUid: string): Promise<Locket[]> {
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
    console.error('Error getting user lockets:', error)
    throw new Error('Failed to get user lockets')
  }
}

/**
 * Get locket by ID with user permissions
 */
export async function getLocketById(id: string, firebaseUid?: string): Promise<Locket | null> {
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
export async function getLocketBySlug(slug: string): Promise<Locket | null> {
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
export async function createLocket(data: CreateLocket): Promise<Locket> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Generate unique slug and invite code
    const slug = await generateLocketSlug(data.name, client)
    const inviteCode = await generateInviteCode(client)

    // Create the locket
    const locketResult = await client.query(`
      INSERT INTO lockets (name, description, slug, invite_code, is_public, share_password, admin_firebase_uid, anniversary_date, cover_photo_url, location_origin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      data.name,
      data.description || null,
      slug,
      inviteCode,
      data.is_public || false,
      data.share_password || null,
      data.admin_firebase_uid,
      data.anniversary_date || null,
      data.cover_photo_url || null,
      data.location_origin || null
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
export async function updateLocket(id: string, updates: UpdateLocket, firebaseUid: string): Promise<Locket> {
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

    if (updates.anniversary_date !== undefined) {
      setParts.push(`anniversary_date = $${paramCount}`)
      values.push(updates.anniversary_date)
      paramCount++
    }

    if (updates.cover_photo_url !== undefined) {
      setParts.push(`cover_photo_url = $${paramCount}`)
      values.push(updates.cover_photo_url)
      paramCount++
    }

    if (updates.location_origin !== undefined) {
      setParts.push(`location_origin = $${paramCount}`)
      values.push(updates.location_origin)
      paramCount++
    }

    if (updates.pinned_memory_id !== undefined) {
      setParts.push(`pinned_memory_id = $${paramCount}`)
      values.push(updates.pinned_memory_id)
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

