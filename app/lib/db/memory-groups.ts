import { query } from './client'
import type { MemoryGroup, CreateMemoryGroup, UpdateMemoryGroup } from '../types'

export async function createMemoryGroup(groupData: CreateMemoryGroup): Promise<MemoryGroup> {
  try {
    const result = await query(`
      INSERT INTO memory_groups (
        locket_id, title, description, date_taken, is_milestone, created_by_firebase_uid
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      groupData.locket_id,
      groupData.title,
      groupData.description,
      groupData.date_taken || null,
      groupData.is_milestone || false,
      groupData.created_by_firebase_uid
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
export async function getAllMemoryGroups(locketId?: string, includeMedia = true, excludeMemoryId?: string | null): Promise<MemoryGroup[]> {
  try {
    const conditions = []
    const params = []
    let paramIndex = 1

    if (locketId) {
      conditions.push(`mg.locket_id = $${paramIndex}`)
      params.push(locketId)
      paramIndex++
    }

    if (excludeMemoryId) {
      conditions.push(`mg.id != $${paramIndex}`)
      params.push(excludeMemoryId)
      paramIndex++
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
              'latitude', m.latitude,
              'longitude', m.longitude,
              'place_name', m.place_name,
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
        ORDER BY COALESCE(mg.date_taken, mg.created_at) DESC
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
        ORDER BY COALESCE(mg.date_taken, mg.created_at) DESC
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

    if (updates.date_taken !== undefined) {
      setParts.push(`date_taken = $${paramCount}`)
      values.push(updates.date_taken)
      paramCount++
    }

    if (updates.is_milestone !== undefined) {
      setParts.push(`is_milestone = $${paramCount}`)
      values.push(updates.is_milestone)
      paramCount++
    }

    if (updates.cover_media_id !== undefined) {
      setParts.push(`cover_media_id = $${paramCount}`)
      values.push(updates.cover_media_id)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id)

    const result = await query(`
      UPDATE memory_groups
      SET ${setParts.join(', ')}, updated_at = NOW()
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
