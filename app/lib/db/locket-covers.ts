import { query, pool } from './client'
import type { LocketCover, CreateLocketCover } from '../types'

export async function getLocketCovers(locketId: string): Promise<LocketCover[]> {
  try {
    const result = await query(`
      SELECT * FROM locket_covers
      WHERE locket_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `, [locketId])
    return result.rows
  } catch (error) {
    console.error('Error fetching locket covers:', error)
    throw new Error('Failed to fetch locket covers')
  }
}

/**
 * Create a new cover photo for a locket
 */
export async function createLocketCover(data: CreateLocketCover): Promise<LocketCover> {
  try {
    // Get the max sort_order for this locket
    const maxOrderResult = await query(`
      SELECT COALESCE(MAX(sort_order), -1) as max_order
      FROM locket_covers
      WHERE locket_id = $1
    `, [data.locket_id])

    const nextOrder = data.sort_order ?? (maxOrderResult.rows[0].max_order + 1)

    const result = await query(`
      INSERT INTO locket_covers (locket_id, photo_url, storage_key, sort_order, added_by_firebase_uid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      data.locket_id,
      data.photo_url,
      data.storage_key || null,
      nextOrder,
      data.added_by_firebase_uid
    ])
    return result.rows[0]
  } catch (error) {
    console.error('Error creating locket cover:', error)
    throw new Error('Failed to create locket cover')
  }
}

/**
 * Delete a cover photo
 */
export async function deleteLocketCover(id: string, locketId: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM locket_covers
      WHERE id = $1 AND locket_id = $2
      RETURNING id
    `, [id, locketId])
    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting locket cover:', error)
    throw new Error('Failed to delete locket cover')
  }
}

/**
 * Reorder cover photos
 */
export async function reorderLocketCovers(locketId: string, coverIds: string[]): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (let i = 0; i < coverIds.length; i++) {
      await client.query(`
        UPDATE locket_covers
        SET sort_order = $1
        WHERE id = $2 AND locket_id = $3
      `, [i, coverIds[i], locketId])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error reordering locket covers:', error)
    throw new Error('Failed to reorder locket covers')
  } finally {
    client.release()
  }
}
