import { UserRoleSchema, type UserRole } from '@pwarpi/shared'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { ApiError } from './errors.js'
import { getAdminAuth, getAdminDatabase } from './firebase-admin.js'

export interface AuthorizedMember {
  uid: string
  tenantId: string
  role: UserRole
  membership: Record<string, unknown>
}

export async function requireTenantMember(
  identity: DecodedIdToken,
  requestedTenantId: unknown,
): Promise<AuthorizedMember> {
  const uid = identity.uid
  if (typeof requestedTenantId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(requestedTenantId)) {
    throw new ApiError('invalid-argument', 'A valid account identifier is required.')
  }

  if (identity.tenantId !== requestedTenantId || typeof identity.role !== 'string') {
    throw new ApiError('permission-denied', 'Your account access is not active.')
  }

  const database = getAdminDatabase()
  const auth = getAdminAuth()
  const [memberSnapshot, user] = await Promise.all([
    database.ref(`tenants/${requestedTenantId}/members/${uid}`).get(),
    auth.getUser(uid),
  ])
  const membership = memberSnapshot.val() as Record<string, unknown> | null

  if (!user.emailVerified) {
    throw new ApiError('permission-denied', 'Verify your email before accessing account data.')
  }

  const parsedRole = UserRoleSchema.safeParse(membership?.role)
  if (!membership || membership.status !== 'active' || !parsedRole.success || parsedRole.data !== identity.role) {
    throw new ApiError('permission-denied', 'Account membership could not be confirmed.')
  }

  return { uid, tenantId: requestedTenantId, role: parsedRole.data, membership }
}
