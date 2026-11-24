import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const [uid, tenantId, role] = process.argv.slice(2)
const allowedRoles = new Set([
  'registrar', 'verifier', 'valuation_specialist', 'compliance_officer',
  'platform_administrator', 'auditor',
])
const projectId = process.env.STAFF_PROJECT_ID
const databaseURL = process.env.FIREBASE_DATABASE_URL

if (!uid || !tenantId || !role || !allowedRoles.has(role) || !projectId || !databaseURL) {
  console.error('Usage: node scripts/provision-staff.mjs <uid> <tenantId> <staff-role>')
  console.error('Set STAFF_PROJECT_ID, FIREBASE_DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS (outside the repository).')
  process.exit(2)
}

const usingEmulators = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST)
const app = initializeApp({
  ...(usingEmulators ? {} : { credential: applicationDefault() }),
  projectId,
  databaseURL,
})
const auth = getAuth(app)
const database = getDatabase(app)
const tenant = await database.ref(`tenants/${tenantId}/profile`).get()
if (!tenant.exists()) throw new Error('The requested workspace does not exist.')

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
    tenantName: tenant.val().displayName ?? 'Private workspace',
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
