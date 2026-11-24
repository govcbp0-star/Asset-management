# Security, Privacy & Compliance Baseline

**This is product guidance, not a legal opinion or certification.** Engage qualified counsel for each operating jurisdiction and business activity.

## Non-negotiable controls
- Firebase Auth with verified email, MFA for staff, strong session handling and account recovery safeguards.
- Tenant isolation: every read/write checks active membership and granular grants; server-side role enforcement.
- RTDB default deny; allow narrowly scoped, validated read models. Sensitive writes only through authenticated Vercel API routes using the Firebase Admin SDK.
- Storage default deny; issue short-lived authorized download/upload capabilities or enforce granular Storage Rules; never expose permanent public links.
- App Check helps abuse resistance but is **not** authorization.
- Four-eyes approval; maker-checker separation; immutable or tamper-evident audit export outside ordinary admin write access.
- Encryption in transit/at rest, controlled key access, secrets management, minimal PII, restricted staff access.
- Rate limiting, abuse monitoring, malware scanning, upload limits, safe file previews, export monitoring.
- Backups, restore drills, disaster recovery objectives, incident playbooks, vulnerability management and penetration testing.
- Retention/deletion schedules with legal holds; access, correction and deletion request workflows.

## Example security rule posture (illustrative only; not deployable as-is)
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "publicConfig": { ".read": true },
    "tenants": {
      "$tenantId": {
        "assets": { ".read": false, ".write": false },
        "reviews": { ".read": false, ".write": false },
        "audit": { ".read": false, ".write": false }
      }
    }
  }
}
```
Expose dedicated, entitlement-filtered read paths only after implementing and testing actual rules. **Admin SDK bypasses Firebase Rules**, so each Vercel API route must independently verify Firebase ID tokens, current tenant membership, role and relevant MFA state. Avoid broad parent `.read` rules because child rules cannot revoke access inherited from parents.

## Legal and operational checks
- Determine whether service is solely recordkeeping/verification or includes regulated investment advice, custody, brokerage or asset management.
- Define contractual scope of verification, reliance, liability, source authenticity and re-verification frequency.
- Confirm identity/business verification, AML/sanctions duties and privacy obligations as applicable.
- Assess Ghana Data Protection Act requirements if operating in Ghana, and relevant international privacy/transfer laws for global clients.
- Obtain rights to access third-party registries and external financial data; don't scrape restricted ownership data.
- Privacy notice, terms of service, DPA/vendor agreements, data transfer assessments, security policies and breach notifications.
- No claims of government recognition, legally conclusive title verification, guaranteed valuation or institutional licensing without evidence.

## Test matrix
Cross-tenant reads/writes denied; forged role claims rejected; reviewer cannot approve own work; revoked access immediately effective; URL guessing cannot retrieve files; report exports respect filters; stale sessions fail; audit entries cannot be altered by normal staff; backups restore successfully.
