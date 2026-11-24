import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const serverAppName = 'pwarpi-vercel-api'

function getAdminApp() {
  const existing = getApps().find((app) => app.name === serverAppName)
  if (existing) return existing

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL?.trim()
  if (!projectId || !databaseURL) {
    throw new Error('Set the Firebase project ID and Realtime Database URL in the server environment.')
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (process.env.VERCEL && !serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required for the Vercel server environment.')
  }

  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault()

  return initializeApp({ credential, projectId, databaseURL }, serverAppName)
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp())
}
