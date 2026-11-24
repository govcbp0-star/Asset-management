# Admin, Verification & Operations Portals

## Admin navigation
Operations Overview; Clients & Organizations; Onboarding/KYC Queue; Assets; Create Asset; Review Queue; Valuations; Documents; Requests; Reports; Staff & Roles; Audit Logs; Settings.

## Operations overview
Active clients; onboarding pending; assets in draft/review; ownership evidence approvals/rejections; stale valuations; document expirations; open client requests; alerts. Filter by assigned team/tenant.

## Client management
Search/filter clients; individual/company/family-office profiles; onboarding state; verified contact info; authorized related entities; delegates; service tier; case history; suspend/reactivate via controlled workflow. No bulk exposure of sensitive records.

## Asset editor
Required: tenant, owning legal entity, name, category, registry ID (server-generated), record status, location/custodian, description, evidence references. Optional class-specific metadata and value details. Autosave draft; explicit submit; validations and duplicate checks.

## Review queue
Assigned reviews with evidence checklist, document preview, provenance, requested scope, risk flags, previous decisions; approve/reject/request-more-info with mandatory rationale. Enforce four-eyes rule; cannot approve one's own record or valuation. Show clear scope and expiration.

## Valuation management
Add dated valuations with source/method, external appraiser and evidence; flag stale or anomalous changes; require second approval for material changes. Preserve full history.

## Document management
Private uploads, malware scanning, file type/size limits, evidence classification, expiry, versioning, retention and deletion holds. Document access always checked server-side.

## Reports & communications
Generate client-specific reports via background job; notify users of completed reviews or needed evidence; use templates that avoid exposing private values by email.

## Audit & security
Append-only event ledger for sign-ins, access grants, reads/downloads of sensitive documents, record changes, approvals, exports and administrative actions. Search by actor, entity, timestamp and event type. Alert on suspicious exports and repeated denied access.

## Super-admin safeguards
Staff provisioning with MFA, custom claims and assignment grants; break-glass access requiring justification, expiration and audit. No universal client-record access simply because a staff member is an admin.
