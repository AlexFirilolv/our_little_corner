import { nanoid } from 'nanoid'
import { adminAuth, mintIdToken } from './firebaseTest'
import { query } from './db'

export interface TestPartner {
  uid: string
  email: string
  mintIdToken: () => Promise<string>
}

export interface TestCouple {
  locketId: string
  partnerA: TestPartner
  partnerB: TestPartner
}

async function createFirebaseUser(): Promise<TestPartner> {
  const id = nanoid(12)
  const uid = `test-${id}`
  const email = `test+${id}@twofold.test`
  await adminAuth().createUser({ uid, email, emailVerified: true, displayName: `Test ${id}` })
  return { uid, email, mintIdToken: () => mintIdToken(uid) }
}

export async function createCouple(): Promise<TestCouple> {
  const [partnerA, partnerB] = await Promise.all([createFirebaseUser(), createFirebaseUser()])

  const locketName = `Test Locket ${nanoid(6)}`
  // slug: lowercase alphanumeric+hyphen, derived from name + unique suffix
  const slugBase = locketName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slug = `${slugBase}-${nanoid(6).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`
  const inviteCode = nanoid(8).toUpperCase()

  const { rows } = await query<{ id: string }>(
    `INSERT INTO lockets (name, slug, invite_code, admin_firebase_uid)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [locketName, slug, inviteCode, partnerA.uid],
  )
  const locketId = rows[0].id

  await query(
    `INSERT INTO locket_users (locket_id, firebase_uid, email, role)
     VALUES ($1, $2, $3, 'admin'), ($1, $4, $5, 'participant')`,
    [locketId, partnerA.uid, partnerA.email, partnerB.uid, partnerB.email],
  )

  return { locketId, partnerA, partnerB }
}

export async function destroyCouple(couple: TestCouple): Promise<void> {
  const errors: unknown[] = []
  try {
    await query('DELETE FROM lockets WHERE id = $1', [couple.locketId])
  } catch (e) {
    errors.push(e)
  }
  try {
    await adminAuth().deleteUsers([couple.partnerA.uid, couple.partnerB.uid])
  } catch (e) {
    errors.push(e)
  }
  if (errors.length) console.error('destroyCouple errors:', errors)
}

/** Safety-net sweep for leftover test-* Firebase users. */
export async function sweepStaleTestUsers(): Promise<void> {
  const stale: string[] = []
  let pageToken: string | undefined
  do {
    const page = await adminAuth().listUsers(1000, pageToken)
    for (const u of page.users) {
      if (u.uid.startsWith('test-')) stale.push(u.uid)
    }
    pageToken = page.pageToken
  } while (pageToken)
  if (stale.length) await adminAuth().deleteUsers(stale)
}
