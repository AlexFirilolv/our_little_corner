import { query } from './client'

export async function getMemoryComments(memoryGroupId: string, locketId: string): Promise<any[]> {
  try {
    const result = await query(`
      SELECT
        mc.*,
        lu.display_name as author_name,
        lu.avatar_url as author_avatar_url
      FROM memory_comments mc
      LEFT JOIN locket_users lu ON mc.locket_id = lu.locket_id AND mc.author_firebase_uid = lu.firebase_uid
      WHERE mc.memory_group_id = $1 AND mc.locket_id = $2
      ORDER BY mc.created_at ASC
    `, [memoryGroupId, locketId])
    return result.rows
  } catch (error) {
    console.error('Error fetching memory comments:', error)
    throw new Error('Failed to fetch comments')
  }
}

/**
 * Create a new comment or activity log
 */
export async function createMemoryComment(data: {
  memory_group_id: string;
  locket_id: string;
  content: string;
  comment_type?: 'comment' | 'activity';
  activity_action?: string;
  author_firebase_uid?: string;
}): Promise<any> {
  try {
    const result = await query(`
      INSERT INTO memory_comments (
        memory_group_id, locket_id, content, comment_type, activity_action, author_firebase_uid
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      data.memory_group_id,
      data.locket_id,
      data.content,
      data.comment_type || 'comment',
      data.activity_action || null,
      data.author_firebase_uid || null,
    ])
    return result.rows[0]
  } catch (error) {
    console.error('Error creating memory comment:', error)
    throw new Error('Failed to create comment')
  }
}

/**
 * Delete a comment
 */
export async function deleteMemoryComment(id: string, locketId: string): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM memory_comments WHERE id = $1 AND locket_id = $2 RETURNING id',
      [id, locketId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error deleting memory comment:', error)
    throw new Error('Failed to delete comment')
  }
}

/**
 * Log an activity for a memory group
 */
export async function logMemoryActivity(
  memoryGroupId: string,
  locketId: string,
  action: string,
  description: string,
  authorFirebaseUid?: string
): Promise<any> {
  return createMemoryComment({
    memory_group_id: memoryGroupId,
    locket_id: locketId,
    content: description,
    comment_type: 'activity',
    activity_action: action,
    author_firebase_uid: authorFirebaseUid,
  })
}
