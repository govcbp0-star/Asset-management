# Roadmap, Milestones & Acceptance Criteria

## Phase 0 — Discovery and legal design
Confirm countries served, entity types, service scope, verification policy, data classifications, risk assessment, retention, and initial pricing hypothesis. Produce requirements and threat model.

## Phase 1 — Foundation
Vite React app, UI kit, routing, Firebase projects/emulators, Auth, MFA, tenant model, staff roles, CI/CD, monitoring, default-deny rules and security tests.

## Phase 2 — Operational MVP
Client onboarding, admin client management, draft asset registration, documents, independent review, valuation records, client dashboard, notifications, correction requests and audit logging.

## Phase 3 — Reporting and launch hardening
Portfolio charts, filters, dated PDF reports, export controls, backups/restore, penetration testing, accessibility, operational runbooks, pilot customers and legal signoff.

## Phase 4 — Expansion
Multi-entity consolidation and ownership graph, delegated family-office access, external data sources, valuation automation, FX history, richer analytics and enterprise integrations. Regulated advisory/custody only after separate legal/licensing program.

## MVP acceptance checklist
- [ ] A client can register, verify email, enroll MFA and complete onboarding.
- [ ] An administrator can create a draft asset for the correct tenant.
- [ ] The same staff user cannot approve their own asset submission.
- [ ] A reviewer can approve/reject with evidence and reason.
- [ ] Approved assets appear only for authorized clients.
- [ ] Client sees accurate category, value, currency, date, location precision and verification scope.
- [ ] Client cannot alter approved asset records through SDK or API.
- [ ] Cross-tenant and document-access attacks fail in automated tests.
- [ ] Every privileged mutation creates an audit event.
- [ ] Valuation updates retain history and show stale data.
- [ ] Reports are permission-scoped and show valuation caveats.
- [ ] Mobile layout, accessibility, backup recovery and incident response are validated.

## Test strategy
Unit tests for validation and valuation formatting; emulator integration tests for Auth/RTDB/Storage rules and API authorization; E2E tests for role journeys; concurrency/idempotency tests; performance and restore drills. Deploy behind staged feature flags.
