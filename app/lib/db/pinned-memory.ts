import { query } from './client'
import type { MemoryGroup } from '../types'

export async function pinMemory(locketId: string, memoryId: string, firebaseUid: string): Promise<void> {
  try {
    // Verify user has permission
    const permission = await query(`
      SELECT cu.role
      FROM locket_users cu
      WHERE cu.locket_id = $1 AND cu.firebase_uid = $2
    `, [locketId, firebaseUid])

    if (permission.rows.length === 0) {
      throw new Error('Permission denied')
    }

    // Verify memory belongs to this locket
    const memoryCheck = await query(`
      SELECT id FROM memory_groups WHERE id = $1 AND locket_id = $2
    `, [memoryId, locketId])

    if (memoryCheck.rows.length === 0) {
      throw new Error('Memory not found in this locket')
    }

    await query(`
      UPDATE lockets
      SET pinned_memory_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [memoryId, locketId])
  } catch (error) {
    console.error('Error pinning memory:', error)
    throw error
  }
}

/**
 * Unpin the current memory from the locket
 */
export async function unpinMemory(locketId: string, firebaseUid: string): Promise<void> {
  try {
    // Verify user has permission
    const permission = await query(`
      SELECT cu.role
      FROM locket_users cu
      WHERE cu.locket_id = $1 AND cu.firebase_uid = $2
    `, [locketId, firebaseUid])

    if (permission.rows.length === 0) {
      throw new Error('Permission denied')
    }

    await query(`
      UPDATE lockets
      SET pinned_memory_id = NULL, updated_at = NOW()
      WHERE id = $1
    `, [locketId])
  } catch (error) {
    console.error('Error unpinning memory:', error)
    throw error
  }
}

/**
 * Get the currently pinned memory for a locket
 */
export async function getPinnedMemory(locketId: string): Promise<MemoryGroup | null> {
  try {
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
            'latitude', m.latitude,
            'longitude', m.longitude,
            'place_name', m.place_name,
            'sort_order', m.sort_order,
            'created_at', m.created_at,
            'updated_at', m.updated_at
          ) ORDER BY m.sort_order, m.created_at
        ) FILTER (WHERE m.id IS NOT NULL) as media_items,
        COUNT(m.id)::integer as media_count
      FROM lockets l
      JOIN memory_groups mg ON l.pinned_memory_id = mg.id
      LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
      LEFT JOIN locket_users lu ON mg.locket_id = lu.locket_id AND mg.created_by_firebase_uid = lu.firebase_uid
      WHERE l.id = $1 AND l.pinned_memory_id IS NOT NULL
      GROUP BY mg.id, lu.id
    `, [locketId])
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching pinned memory:', error)
    throw new Error('Failed to fetch pinned memory')
  }
}

