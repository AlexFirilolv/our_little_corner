import { query } from './client'
import type { MemoryGroup, SpotlightMemory } from '../types'

export async function getMemoriesOnThisDay(locketId: string): Promise<MemoryGroup[]> {
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
      FROM memory_groups mg
      LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
      LEFT JOIN locket_users lu ON mg.locket_id = lu.locket_id AND mg.created_by_firebase_uid = lu.firebase_uid
      WHERE mg.locket_id = $1
        AND EXTRACT(MONTH FROM COALESCE(mg.date_taken, mg.created_at)) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM COALESCE(mg.date_taken, mg.created_at)) = EXTRACT(DAY FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM COALESCE(mg.date_taken, mg.created_at)) < EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY mg.id, lu.id
      ORDER BY COALESCE(mg.date_taken, mg.created_at) DESC
    `, [locketId])
    return result.rows
  } catch (error) {
    console.error('Error fetching memories on this day:', error)
    throw new Error('Failed to fetch memories on this day')
  }
}

/**
 * Get a random memory from the locket (with media)
 */
export async function getRandomMemory(locketId: string): Promise<MemoryGroup | null> {
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
      FROM memory_groups mg
      LEFT JOIN media m ON mg.id = m.memory_group_id AND mg.locket_id = m.locket_id
      LEFT JOIN locket_users lu ON mg.locket_id = lu.locket_id AND mg.created_by_firebase_uid = lu.firebase_uid
      WHERE mg.locket_id = $1
      GROUP BY mg.id, lu.id
      HAVING COUNT(m.id) > 0
      ORDER BY RANDOM()
      LIMIT 1
    `, [locketId])
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching random memory:', error)
    throw new Error('Failed to fetch random memory')
  }
}

/**
 * Get spotlight memory: prioritize "On This Day", fallback to random
 */
export async function getSpotlightMemory(locketId: string): Promise<SpotlightMemory> {
  try {
    // First try "On This Day"
    const onThisDayMemories = await getMemoriesOnThisDay(locketId)

    if (onThisDayMemories.length > 0) {
      const memory = onThisDayMemories[0]
      const memoryDate = memory.date_taken ? new Date(memory.date_taken) : new Date(memory.created_at)
      const yearsAgo = new Date().getFullYear() - memoryDate.getFullYear()

      return {
        memory,
        type: 'on_this_day',
        years_ago: yearsAgo
      }
    }

    // Fallback to random
    const randomMemory = await getRandomMemory(locketId)

    if (randomMemory) {
      return {
        memory: randomMemory,
        type: 'random'
      }
    }

    return {
      memory: null,
      type: 'none'
    }
  } catch (error) {
    console.error('Error fetching spotlight memory:', error)
    return { memory: null, type: 'none' }
  }
}
