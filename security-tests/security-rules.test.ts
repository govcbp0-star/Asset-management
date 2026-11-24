import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { get, ref, set } from '@firebase/database'
import { getBytes, ref as storageRef, uploadBytes } from '@firebase/storage'

let testEnvironment: RulesTestEnvironment

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'demo-private-wealth-registry',
    database: {
      host: '127.0.0.1', port: 9000,
      rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'),
    },
    storage: {
      host: '127.0.0.1', port: 9199,
      rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'),
    },
  })
})

afterAll(async () => { await testEnvironment?.cleanup() })

describe('default-deny Firebase rules', () => {
  it('allows public config reads but denies access to a member and private records', async () => {
    const user = testEnvironment.authenticatedContext('client-a', { tenantId: 'tenant-a', role: 'client_owner' })
    await assertSucceeds(get(ref(user.database(), 'publicConfig')))
    await assertFails(get(ref(user.database(), 'tenants/tenant-a/members/client-a')))
    await assertFails(get(ref(user.database(), 'tenants/tenant-a/assets/asset-a')))
  })

  it('denies a cross-tenant read even when the token names the source tenant', async () => {
    const user = testEnvironment.authenticatedContext('client-a', { tenantId: 'tenant-a', role: 'client_owner' })
    await assertFails(get(ref(user.database(), 'tenants/tenant-b/assets/asset-secret')))
  })

  it('does not accept forged administrator claims for privileged writes', async () => {
    const attacker = testEnvironment.authenticatedContext('attacker', {
      tenantId: 'tenant-a', role: 'platform_administrator',
    })
    await assertFails(set(ref(attacker.database(), 'tenants/tenant-a/assets/new-record'), { recordStatus: 'active' }))
    await assertFails(set(ref(attacker.database(), 'tenants/tenant-a/audit/event'), { action: 'forged' }))
    await assertFails(set(ref(attacker.database(), 'userTenantIndex/attacker/tenant-a'), { role: 'platform_administrator' }))
  })

  it('denies document reads and writes without an authorized server capability', async () => {
    const user = testEnvironment.authenticatedContext('client-a', { tenantId: 'tenant-a', role: 'client_owner' })
    const document = storageRef(user.storage(), 'tenants/tenant-a/assets/asset-a/evidence.pdf')
    await assertFails(getBytes(document))
    await assertFails(uploadBytes(document, new Uint8Array([1, 2, 3])))
  })
})
