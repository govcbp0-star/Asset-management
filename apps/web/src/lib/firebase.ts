import { initializeApp } from '@firebase/app'
import { getAuth } from '@firebase/auth'
import { getDatabase } from '@firebase/database'
import { getStorage } from '@firebase/storage'

const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseConfigured = Object.values(config).every((value) => Boolean(value))
export const firebaseApp = firebaseConfigured ? initializeApp(config) : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null
export const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null
