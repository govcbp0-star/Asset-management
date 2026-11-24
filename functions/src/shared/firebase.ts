import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const firebaseConfig = (() => {
  try { return JSON.parse(process.env.FIREBASE_CONFIG ?? '{}') as { projectId?: string; databaseURL?: string } }
  catch { return {} }
})()
const projectId = process.env.GCLOUD_PROJECT ?? firebaseConfig.projectId ?? 'demo-private-wealth-registry'
const databaseEmulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST
const databaseURL = process.env.FIREBASE_DATABASE_URL
  ?? firebaseConfig.databaseURL
  ?? (databaseEmulator ? `http://${databaseEmulator}?ns=${projectId}` : undefined)

const app = getApps()[0] ?? initializeApp({ projectId, databaseURL })

export const adminAuth = getAuth(app)
export const adminDatabase = getDatabase(app)
