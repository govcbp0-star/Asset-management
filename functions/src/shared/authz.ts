import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { UserRoleSchema, type UserRole } from '@pwarpi/shared'
import { adminAuth, adminDatabase } from './firebase.js'

export interface AuthorizedMember {
  uid: string
  tenantId: string
  role: UserRole
  membership: Record<string, unknown>
}

export async function requireTenantMember(
  request: CallableRequest<unknown>,
  requestedTenantId: unknown,
): Promise<AuthorizedMember> {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  if (typeof requestedTenantId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(requestedTenantId)) {
    throw new HttpsError('invalid-argument', 'A valid account identifier is required.')
  }

  const claims = (request.auth?.token ?? {}) as Record<string, unknown>
  if (claims.tenantId !== requestedTenantId || typeof claims.role !== 'string') {
    throw new HttpsError('permission-denied', 'Your account access is not active.')
  }

  const [memberSnapshot, user] = await Promise.all([
    adminDatabase.ref(`tenants/${requestedTenantId}/members/${uid}`).get(),
    adminAuth.getUser(uid),
  ])
  const membership = memberSnapshot.val() as Record<string, unknown> | null
  if (!user.emailVerified) {
    throw new HttpsError('permission-denied', 'Verify your email before accessing account data.')
  }
  const parsedRole = UserRoleSchema.safeParse(membership?.role)
  if (!membership || membership.status !== 'active' || !parsedRole.success || parsedRole.data !== claims.role) {
    throw new HttpsError('permission-denied', 'Account membership could not be confirmed.')
  }

  if (parsedRole.data !== 'client_owner' && parsedRole.data !== 'client_delegate') {
    const factors = user.multiFactor?.enrolledFactors ?? []
    if (factors.length === 0) {
      throw new HttpsError('failed-precondition', 'Staff multi-factor authentication is required.')
    }
  }

  return { uid, tenantId: requestedTenantId, role: parsedRole.data, membership }
}
