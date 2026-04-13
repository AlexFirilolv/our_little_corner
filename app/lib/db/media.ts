import { query } from './client'
import type { MediaItem, CreateMediaItem, UpdateMediaItem, Session } from '../types'

export async function getAllMedia(locketId?: string): Promise<MediaItem[]> {
  try {
    let query_text = `
      SELECT m.*, mg.title as memory_group_title 
      FROM media m
      LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
      ORDER BY m.created_at DESC
    `
    let values: any[] = []

    if (locketId) {
      query_text = `
        SELECT m.*, mg.title as memory_group_title 
        FROM media m
        LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
        WHERE m.locket_id = $1
        ORDER BY m.created_at DESC
      `
      values = [locketId]
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
export async function getMediaById(id: string, locketId?: string): Promise<MediaItem | null> {
  try {
    let query_text = `
      SELECT m.*, mg.title as memory_group_title 
      FROM media m
      LEFT JOIN memory_groups mg ON m.memory_group_id = mg.id
      WHERE m.id = $1
    `
    let values = [id]

    if (locketId) {
      query_text += ` AND m.locket_id = $2`
      values.push(locketId)
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
        width, height, duration, title, note, date_taken, sort_order, uploaded_by_firebase_uid,
        latitude, longitude, place_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      mediaData.locket_id,
      mediaData.memory_group_id,
      mediaData.filename,
      mediaData.original_name || mediaData.filename, // Default to filename if not provided
      mediaData.storage_key,
      mediaData.storage_url,
      mediaData.file_type,
      mediaData.file_size,
      mediaData.width || null,
      mediaData.height || null,
      mediaData.duration || null,
      mediaData.title || null,
      mediaData.note || null,
      mediaData.date_taken || null,
      mediaData.sort_order || 0,
      mediaData.uploaded_by_firebase_uid,
      mediaData.latitude || null,
      mediaData.longitude || null,
      mediaData.place_name || null,
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

    // Location fields
    if (updates.latitude !== undefined) {
      setParts.push(`latitude = $${paramCount}`)
      values.push(updates.latitude)
      paramCount++
    }
    if (updates.longitude !== undefined) {
      setParts.push(`longitude = $${paramCount}`)
      values.push(updates.longitude)
      paramCount++
    }
    if (updates.place_name !== undefined) {
      setParts.push(`place_name = $${paramCount}`)
      values.push(updates.place_name)
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
