import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const [uid, tenantId, role] = process.argv.slice(2)
const allowedRoles = new Set([
  'registrar', 'verifier', 'valuation_specialist', 'compliance_officer',
  'platform_administrator', 'auditor',
])
const projectId = process.env.VITE_FIREBASE_PROJECT_ID
const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

if (!uid || !tenantId || !role || !allowedRoles.has(role) || !projectId || !databaseURL) {
  console.error('Usage: node --env-file=.env.local scripts/provision-staff.mjs <auth-uid> <tenant-id> <staff-role>')
  console.error('Set VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_DATABASE_URL and either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.')
  process.exit(2)
}

const credential = serviceAccountJson
  ? cert(JSON.parse(serviceAccountJson))
  : applicationDefault()
const app = initializeApp({ credential, projectId, databaseURL })
const auth = getAuth(app)
const database = getDatabase(app)
const tenant = await database.ref(`tenants/${tenantId}/profile`).get()
if (!tenant.exists()) throw new Error('The requested account does not exist.')

const user = await auth.getUser(uid)
if (!user.emailVerified) throw new Error('Staff accounts must have a verified email address.')
const now = { '.sv': 'timestamp' }
const eventRef = database.ref(`tenants/${tenantId}/audit`).push()
const updates = {
  [`tenants/${tenantId}/members/${uid}`]: {
    role, status: 'active', entityScopes: [], createdAt: now,
  },
  [`userTenantIndex/${uid}/${tenantId}`]: { role, status: 'active' },
  [`tenants/${tenantId}/readModels/staffOverview/${uid}`]: {
    tenantName: tenant.val().displayName ?? 'Private account',
    tenantType: tenant.val().kind ?? 'company',
    tenantStatus: tenant.val().status ?? 'onboarding',
    onboardingStatus: tenant.val().onboardingStatus ?? 'pending_review',
    reportingCurrency: 'USD', asOf: Date.now(), grossRegisteredValueMinor: null,
    counts: { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 },
    allocations: [], recentActivity: [],
  },
  [`tenants/${tenantId}/audit/${eventRef.key}`]: {
    action: 'staff_membership_provisioned', actorUid: 'trusted_provisioning_operator',
    subjectUid: uid, occurredAt: now, metadata: { role },
  },
}
await database.ref().update(updates)
await auth.setCustomUserClaims(uid, {
  ...user.customClaims, tenantId, role, membershipVersion: 1,
})
console.log(`Provisioned ${role} access for ${uid} in ${tenantId}.`)
