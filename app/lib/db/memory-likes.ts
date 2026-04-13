import { query } from './client'

export async function toggleMemoryLike(
  memoryGroupId: string,
  locketId: string,
  userFirebaseUid: string
): Promise<{ liked: boolean; likeCount: number }> {
  try {
    // Check if like exists
    const existingLike = await query(
      'SELECT id FROM memory_likes WHERE memory_group_id = $1 AND user_firebase_uid = $2',
      [memoryGroupId, userFirebaseUid]
    )

    if (existingLike.rows.length > 0) {
      // Remove like
      await query(
        'DELETE FROM memory_likes WHERE memory_group_id = $1 AND user_firebase_uid = $2',
        [memoryGroupId, userFirebaseUid]
      )
    } else {
      // Add like
      await query(
        'INSERT INTO memory_likes (memory_group_id, locket_id, user_firebase_uid) VALUES ($1, $2, $3)',
        [memoryGroupId, locketId, userFirebaseUid]
      )
    }

    // Get updated count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM memory_likes WHERE memory_group_id = $1',
      [memoryGroupId]
    )

    return {
      liked: existingLike.rows.length === 0, // Was not liked before, so now it is
      likeCount: parseInt(countResult.rows[0].count, 10)
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    throw error
  }
}

/**
 * Get like status and count for a memory group
 */
export async function getMemoryLikeStatus(
  memoryGroupId: string,
  userFirebaseUid: string
): Promise<{ liked: boolean; likeCount: number }> {
  try {
    const [likeCheck, countResult] = await Promise.all([
      query(
        'SELECT id FROM memory_likes WHERE memory_group_id = $1 AND user_firebase_uid = $2',
        [memoryGroupId, userFirebaseUid]
      ),
      query(
        'SELECT COUNT(*) as count FROM memory_likes WHERE memory_group_id = $1',
        [memoryGroupId]
      )
    ])

    return {
      liked: likeCheck.rows.length > 0,
      likeCount: parseInt(countResult.rows[0].count, 10)
    }
  } catch (error) {
    console.error('Error getting like status:', error)
    throw error
  }
}

/**
 * Get like counts for multiple memory groups at once
 */
export async function getMemoryLikeCounts(
  memoryGroupIds: string[],
  userFirebaseUid: string
): Promise<Map<string, { liked: boolean; likeCount: number }>> {
  if (memoryGroupIds.length === 0) {
    return new Map()
  }

  try {
    // Get counts for all groups
    const countsResult = await query(`
      SELECT memory_group_id, COUNT(*) as count
      FROM memory_likes
      WHERE memory_group_id = ANY($1)
      GROUP BY memory_group_id
    `, [memoryGroupIds])

    // Get user's likes
    const userLikesResult = await query(`
      SELECT memory_group_id
      FROM memory_likes
      WHERE memory_group_id = ANY($1) AND user_firebase_uid = $2
    `, [memoryGroupIds, userFirebaseUid])

    const userLikedSet = new Set<string>(userLikesResult.rows.map((r: any) => r.memory_group_id))
    const countsMap = new Map<string, number>(countsResult.rows.map((r: any) => [r.memory_group_id, parseInt(r.count, 10)]))

    const result = new Map<string, { liked: boolean; likeCount: number }>()
    for (const id of memoryGroupIds) {
      result.set(id, {
        liked: userLikedSet.has(id),
        likeCount: countsMap.get(id) || 0
      })
    }

    return result
  } catch (error) {
    console.error('Error getting like counts:', error)
    throw error
  }
}
