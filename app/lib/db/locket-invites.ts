import { query, pool } from './client'
import type { Locket, LocketUser, LocketInvite, CreateLocketInvite } from '../types'

export async function getLocketInvites(locketId: string): Promise<LocketInvite[]> {
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
    `, [locketId])

    return result.rows
  } catch (error) {
    console.error('Error fetching locket invites:', error)
    throw new Error('Failed to get locket invites')
  }
}

/**
 * Create a locket invite
 */
export async function createLocketInvite(data: CreateLocketInvite): Promise<LocketInvite> {
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
export async function getLocketInviteByToken(token: string): Promise<LocketInvite | null> {
  try {
    const result = await query(`
      SELECT ci.*, c.name as locket_name
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
export async function revokeLocketInvite(inviteId: string, firebaseUid: string): Promise<void> {
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
export async function getInviteByLocketCodeAndEmail(inviteCode: string, email: string): Promise<LocketInvite & { locket?: any, invited_by?: any }> {
  try {
    const result = await query(`
      SELECT 
        ci.*,
        c.name as locket_name,
        c.description as locket_description,
        cu.display_name as invited_by_name,
        cu.email as invited_by_email
      FROM locket_invites ci
      JOIN lockets c ON ci.locket_id = c.id
      LEFT JOIN locket_users cu ON ci.invited_by_firebase_uid = cu.firebase_uid AND cu.locket_id = ci.locket_id
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
      invited_by: invite.invited_by_name ? { name: invite.invited_by_name, email: invite.invited_by_email } : undefined,
      locket: {
        id: invite.locket_id,
        name: invite.locket_name,
        description: invite.locket_description
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
export async function acceptLocketInvite(
  inviteId: string,
  firebaseUid: string,
  email: string,
  displayName: string
): Promise<LocketUser> {
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

    // Update invite status
    await client.query(`
      UPDATE locket_invites
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [inviteId])

    // Add user to locket
    const userResult = await client.query(`
      INSERT INTO locket_users (locket_id, firebase_uid, email, display_name, role, can_upload, can_edit_others_media)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (locket_id, firebase_uid) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        can_upload = EXCLUDED.can_upload,
        can_edit_others_media = EXCLUDED.can_edit_others_media
      RETURNING *
    `, [
      invite.locket_id,
      firebaseUid,
      email,
      displayName,
      invite.role,
      invite.can_upload,
      invite.can_edit_others_media
    ])

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
 * Get locket by invite code
 */
export async function getLocketByInviteCode(inviteCode: string): Promise<Locket | null> {
  try {
    const result = await query(`
      SELECT 
        c.*,
        COUNT(DISTINCT cu.id) as member_count,
        COUNT(DISTINCT m.id) as media_count,
        (SELECT admin.display_name FROM locket_users admin WHERE admin.locket_id = c.id AND admin.role = 'admin' LIMIT 1) as admin_name,
        (SELECT admin.email FROM locket_users admin WHERE admin.locket_id = c.id AND admin.role = 'admin' LIMIT 1) as admin_email
      FROM lockets c
      LEFT JOIN locket_users cu ON c.id = cu.locket_id
      LEFT JOIN media m ON c.id = m.locket_id
      WHERE c.invite_code = $1
      GROUP BY c.id
    `, [inviteCode])

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      ...row,
      member_count: parseInt(row.member_count) || 0,
      media_count: parseInt(row.media_count) || 0,
      invited_by: row.admin_email ? { name: row.admin_name || 'Admin', email: row.admin_email } : undefined
    }
  } catch (error) {
    console.error('Error getting locket by invite code:', error)
    throw new Error('Failed to get locket')
  }
}

/**
 * Join locket by invite code
 */
export async function joinLocketByInviteCode(
  inviteCode: string,
  firebaseUid: string,
  email: string,
  displayName: string
): Promise<LocketUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get the locket
    const locketResult = await client.query(`
      SELECT * FROM lockets WHERE invite_code = $1
    `, [inviteCode])

    if (locketResult.rows.length === 0) {
      throw new Error('Locket not found')
    }

    const locket = locketResult.rows[0]

    // Check if user is already a member
    const existingUser = await client.query(`
      SELECT * FROM locket_users WHERE locket_id = $1 AND firebase_uid = $2
    `, [locket.id, firebaseUid])

    if (existingUser.rows.length > 0) {
      throw new Error('User is already a member of this locket')
    }

    // Add user to locket as a participant
    const userResult = await client.query(`
      INSERT INTO locket_users (locket_id, firebase_uid, email, display_name, role, can_upload, can_edit_others_media)
      VALUES ($1, $2, $3, $4, 'participant', true, false)
      RETURNING *
    `, [locket.id, firebaseUid, email, displayName])

    await client.query('COMMIT')
    return userResult.rows[0]

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error joining locket by invite code:', error)
    throw error
  } finally {
    client.release()
  }
}

// =============================================================================
// SHARED ACCESS TOKENS FUNCTIONS
// =============================================================================

/**
 * Get pending invites for a user by email
 */
export async function getPendingInvitesForEmail(email: string): Promise<LocketInvite[]> {
  try {
    const result = await query(`
      SELECT 
        ci.*,
        c.name as locket_name,
        c.description as locket_description,
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
        name: row.locket_name,
        description: row.locket_description
      }
    }))
  } catch (error) {
    console.error('Error getting pending invites for email:', error)
    throw error
  }
}
