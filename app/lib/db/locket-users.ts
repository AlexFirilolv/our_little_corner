import { query } from './client'
import type { Locket, LocketUser, CreateLocketUser, UpdateLocketUser } from '../types'

export async function getLocketUsers(locketId: string): Promise<LocketUser[]> {
  try {
    const result = await query(`
      SELECT cu.*, c.name as locket_name
      FROM locket_users cu
      LEFT JOIN lockets c ON cu.locket_id = c.id
      WHERE cu.locket_id = $1
      ORDER BY cu.role DESC, cu.joined_at ASC
    `, [locketId])

    return result.rows
  } catch (error) {
    console.error('Error getting locket users:', error)
    throw new Error('Failed to get locket users')
  }
}

/**
 * Add user to locket
 */
export async function addUserToLocket(data: CreateLocketUser): Promise<LocketUser> {
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
  locketId: string,
  userId: string,
  updates: UpdateLocketUser,
  requestingUserUid: string
): Promise<LocketUser> {
  try {
    // Check if requesting user has permission
    const permission = await query(`
      SELECT cu.role, cu.can_manage_locket
      FROM locket_users cu 
      WHERE cu.locket_id = $1 AND cu.firebase_uid = $2
    `, [locketId, requestingUserUid])

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

    values.push(locketId, userId)

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
  locketId: string,
  userId: string,
  role: 'admin' | 'participant'
): Promise<LocketUser> {
  try {
    const result = await query(`
      UPDATE locket_users 
      SET role = $3, last_active_at = NOW()
      WHERE locket_id = $1 AND id = $2
      RETURNING *
    `, [locketId, userId, role])

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
  locketId: string,
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
    `, [locketId, requestingUserUid])

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
    `, [locketId, userId])

    return result.rowCount > 0
  } catch (error) {
    console.error('Error removing user from locket:', error)
    return false
  }
}
