import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { getStorage } from 'firebase-admin/storage'

const serverAppName = 'pwarpi-vercel-api'

function serviceAccountCredential(serviceAccountJson: string, projectId: string) {
  let serviceAccount: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(serviceAccountJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    serviceAccount = parsed as Record<string, unknown>
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain exactly one valid service-account JSON object.')
  }

  if (serviceAccount.type !== 'service_account' || typeof serviceAccount.project_id !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not a service-account credential.')
  }
  if (serviceAccount.project_id !== projectId) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belongs to a different Firebase project.')
  }

  return cert(serviceAccount)
}

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
    ? serviceAccountCredential(serviceAccountJson, projectId)
    : applicationDefault()

  return initializeApp({
    credential,
    projectId,
    databaseURL,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  }, serverAppName)
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp())
}

export function getAdminStorageBucket() {
  const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim()
  if (!bucketName) throw new Error('Set the Firebase Storage bucket in the server environment.')
  return getStorage(getAdminApp()).bucket(bucketName)
}
