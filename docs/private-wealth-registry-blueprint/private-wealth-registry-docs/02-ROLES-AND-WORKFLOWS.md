# Roles, Permissions & Workflows

## Roles
- **Visitor:** public pages only.
- **Client owner:** manages account and authorized viewers; reads own permitted records; requests changes; no direct approved asset writes.
- **Client delegate:** read or limited request access to explicitly granted entities/assets.
- **Registrar:** creates/edits draft records and evidence, cannot approve own submissions.
- **Verifier:** reviews evidence and approves/rejects within assigned scope; cannot approve own authored changes.
- **Valuation specialist:** submits valuation assessments with provenance, not ownership approvals.
- **Compliance officer:** oversees onboarding, risk and access reviews.
- **Platform administrator:** manages tenants/staff/configuration; sensitive content access only when explicitly authorized and logged.
- **Auditor:** time-bounded read-only audit access.

Permissions must be server-enforced per tenant, entity, asset and action, not just hidden UI.

## Core journeys
### Client onboarding
Register → verify email → MFA enrollment → accept privacy/terms → create individual or organization account → submit onboarding evidence → compliance review → active client account. Pending users see limited onboarding state.

### Asset registration
Client requests asset entry (optional) → registrar opens draft → captures owner, class, identifiers, location, value, source, documents → submits for review → independent verifier evaluates evidence → approves/rejects with rationale → approved record published to authorized client dashboard → notification and audit event.

### Asset update
Client submits correction request → registrar creates proposed revision → reviewer checks material changes → approved revision becomes current → previous version retained → client notified.

### Valuation
Record value, currency, as-of date, source, method and appraiser → independent review where applicable → immutable valuation history → dashboards show last valid approved figure with stale indicator. Avoid double counting assets held through companies/trusts.

### Access grant
Client owner requests delegation → compliance/authorization checks as required → time-limited grant to specific assets/entities → revoke at any time → audit every grant/revocation.

### Incident response
Detect suspicious activity → suspend relevant sessions/privileges → investigate access logs → preserve evidence → notify affected parties/regulators as legally required → document remediation.
