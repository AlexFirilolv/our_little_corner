import { cert, getApps as getAdminApps, initializeApp as initAdmin } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getApps as getClientApps, initializeApp as initClient } from 'firebase/app'
import {
  getAuth as getClientAuth,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth'

function initAdminApp() {
  if (getAdminApps().length) return
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  initAdmin({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

function initClientApp() {
  if (getClientApps().length) return
  initClient({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  })
}

export function adminAuth() {
  initAdminApp()
  return getAdminAuth()
}

export async function mintIdToken(uid: string): Promise<string> {
  initAdminApp()
  initClientApp()
  const customToken = await getAdminAuth().createCustomToken(uid)
  const auth = getClientAuth()
  const cred = await signInWithCustomToken(auth, customToken)
  const idToken = await cred.user.getIdToken()
  await signOut(auth) // release client state so next mintIdToken is clean
  return idToken
}
