# Master Build Prompt

Copy the following prompt into your coding assistant. It is designed for incremental implementation, not a claim that a production institution can be generated in one pass.

---

You are a senior full-stack architect, Firebase security engineer, and product designer. Build a premium, secure **Private Wealth Asset Registry & Portfolio Intelligence Platform** for high-net-worth individuals, companies and family offices. Use the accompanying project documentation as the source of truth, especially `README.md`, `03-CLIENT-PORTAL.md`, `04-ADMIN-AND-VERIFICATION.md`, `05-DATA-MODEL.md`, `06-TECHNICAL-ARCHITECTURE.md`, and `07-SECURITY-AND-COMPLIANCE.md`.

**Stack:** Vite + React + TypeScript, Tailwind CSS, React Router, React Hook Form + Zod, Firebase Authentication, Firebase Realtime Database, Firebase Cloud Functions v2, Firebase Cloud Storage and App Check. Prefer accessible, maintainable components, strong typing and clear separation of UI, domain logic and Firebase access.

**Product:** Clients register, onboard, and view private asset portfolios. Authorized registrars create and edit asset drafts on their behalf. Separate reviewers approve ownership evidence with documented scope and rationale. Valuation status must be separate from ownership verification. Clients cannot directly create or approve verified asset records. Support individuals, companies and family offices with multiple legal-owner entities and delegated access.

**Public site:** Create Home, Services, Who We Serve, How It Works, About, Contact, Privacy, Terms and Disclosures pages with premium institutional visual design (navy, charcoal, off-white, subtle gold), mobile responsiveness, accessibility and clear CTAs. Avoid false licensing/certification claims.

**Client portal:** Overview with gross registered value and as-of date, counts by status, allocation and jurisdiction charts, recent activity and alerts; searchable/filterable assets list; detailed asset pages with registry ID, owner, valuation source/date, location precision, separate evidence/valuation statuses, documents and timeline; analytics; private locations view; reports; requests; notifications; security and delegated access settings. Use labeled fictional seed data for demo mode only.

**Staff portals:** Admin operations dashboard, client onboarding and tenant management, asset draft editor, evidence uploads, review queue, valuation history, document management, requests, reports, audit log and staff permissions. Enforce maker-checker separation: author cannot approve own work. Reviewer tools must be permission scoped.

**Security first:** Default-deny RTDB and Storage rules; all privileged writes through Cloud Functions with Firebase Auth verification, tenant/entity authorization, Zod validation, optimistic concurrency, server timestamps and audit events. Do not trust UI role flags. Use MFA for staff, App Check as supplementary abuse defense, secure upload/download flows, rate limits, redaction and no public document URLs. Keep sensitive data out of client logs and email notifications. Include emulator tests for cross-tenant denial, forged claims, maker-checker, revoked access and document access. Never use a permissive production ruleset.

**Data:** Implement tenant-scoped RTDB records for users, memberships, legal entities, assets, asset revisions, valuations, review decisions, document metadata, requests, notifications, access grants and audit events. Documents go in private Storage. Model money in decimal-safe minor units, with currency, source, as-of date and FX provenance. Avoid double counting through entities. Use RTDB denormalized read models and indexes where needed.

**Implementation order:**
1. Inspect repository and propose a detailed implementation plan and file tree.
2. Scaffold Vite app, routing, design system, environment configuration and Firebase emulators.
3. Implement authentication, onboarding, role/tenant authorization, default-deny rules and tests.
4. Implement Cloud Functions and asset lifecycle with review separation and audit events.
5. Build responsive client portal and staff dashboards using real authorized reads; seed fictional demo records separately.
6. Add private document workflows, valuations, reporting, notifications and requests.
7. Add automated unit, emulator integration and Playwright E2E tests; document deployment and backup procedures.

**Deliverables:** Complete repository structure, functional code, security rules, Firebase indexes, Cloud Functions, environment template, seed scripts, tests, README, deployment instructions, threat model and an explicit list of assumptions/unfinished integrations. Use real working flows rather than fake buttons. Do not claim external registry verification unless an actual authorized provider is integrated. Mark mock integrations as mock. Do not deploy to production or use real client records without approval.

**First response:** Show the architecture, folder tree, implementation phases, initial schemas, security strategy and unresolved decisions. Then implement Phase 1 with runnable code and tests. Continue phase by phase, explaining verification steps and any blockers.

---
