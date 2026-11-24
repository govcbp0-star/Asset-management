# Private Wealth Registry

A private, permissioned asset recordkeeping and portfolio oversight application. This project is an implementation scaffold; it does not certify title, custody assets, provide financial advice, or represent that any external registry has been checked.

## Architecture

```text
Browser → Vite / React / TypeScript → Firebase Authentication
                                  ↘ same-origin Vercel API → Firebase Admin SDK → RTDB
                                                                            → private Storage (rules deny access until upload flows exist)
```

The browser is untrusted. RTDB and Storage rules deny direct reads and writes by default. The Vercel API verifies Firebase ID tokens, checks tenant membership and staff MFA, validates inputs with shared Zod schemas, and uses the Admin SDK for protected database access. Staff claims are set only by the trusted provisioning utility; the UI does not grant roles. This deployment choice replaces the original build prompt's Firebase Cloud Functions runtime.

## Repository map

```text
apps/web/                 Vite app, public pages, auth flows, role dashboards
  src/app/                routes and guards
  src/components/         shared UI and portal shell
  src/features/auth/      registration, verification, onboarding, MFA, sign-in
  src/features/dashboard/ client and staff landing dashboards
  src/lib/                Firebase client and same-origin API client
api/                      Vercel API routes for account setup and dashboard reads
server/                   Admin SDK setup, token verification and authorization
scripts/                  trusted staff provisioning utility
functions/                legacy Firebase Functions source retained from initial setup; not deployed or called
packages/shared/          roles, tenant contracts, dashboard DTOs and Zod schemas
database.rules.json       default-deny RTDB rules
storage.rules             default-deny Storage rules
docs/                     supplied product and architecture blueprint
```

## Implementation phases

1. **Foundation, authentication and role dashboards (current):** Vite, Tailwind, routes, email/password and Google auth, client account setup before email verification, staff MFA enrollment gate, server-authorized dashboards, and RTDB/Storage default-deny rules.
2. **Operational MVP:** tenant/client management, asset drafts and revisions, submission/review separation, audit events, valuation history, and correction requests.
3. **Private documents and reporting:** server-authorized uploads/downloads, malware scanning, notifications, scheduled reports, and exports.
4. **Launch hardening:** emulator and browser security tests, accessibility review, backup/restore procedures, monitoring, and jurisdiction-specific legal/operations signoff.

## Data contracts

- RTDB tenant path: `/tenants/{tenantId}`. Users map to tenant memberships at `/tenants/{tenantId}/members/{uid}`; server-maintained `/userTenantIndex/{uid}/{tenantId}` supports account administration.
- Client dashboards come from `/tenants/{tenantId}/readModels/clientOverview/{uid}`. Read models contain only approved aggregates and are returned by the Vercel API after membership checks.
- Account roles are `client_owner`, `client_delegate`, `registrar`, `verifier`, `valuation_specialist`, `compliance_officer`, `platform_administrator`, and `auditor`.
- Asset lifecycle, evidence review, and valuation status remain separate. Monetary amounts use decimal-safe integer minor-unit strings and explicit currency.
- Onboarding records an acknowledgement of development notice versions only. Production service terms, privacy text, current pricing, and jurisdiction requirements must be reviewed before use.

## Local development

1. Copy the root `.env.example` to `.env.local` and fill in the real Web app settings from Firebase Console → Project settings → General → Your apps. Get the Realtime Database URL from RTDB. Vite and the local Admin SDK tools read this same root file.
2. Enable Email/Password, Google sign-in and Phone multi-factor authentication in Firebase Auth. Add `localhost` for local development and your Vercel deployment domain under Firebase Authentication → Settings → Authorized domains. The browser connects to Firebase Auth directly and calls same-origin Vercel API routes for protected account operations.
3. Install and validate:

   ```powershell
   npm install
   npm run build
   npm run typecheck
   npm run lint
   npm test
   ```

4. Start the web client with `npm run dev`. It connects to the real services named in `.env.local`; there is no emulator startup step.

The repository does not include your real Firebase values. `VITE_` values are public web configuration, not service-account secrets. The server reads the same `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_DATABASE_URL` values. `FIREBASE_SERVICE_ACCOUNT_JSON` is a server-only Admin SDK credential: set it in Vercel Project Environment Variables, never in a `VITE_` variable or a committed file. For local API use, `GOOGLE_APPLICATION_CREDENTIALS` may point to a protected credential file outside the repository. The RTDB and Storage rules continue to deny direct browser access by default.

## Staff provisioning

Staff cannot choose their own role. Create and verify the staff sign-in in Firebase, then provision its role through the trusted utility. It reads the central `.env.local` file:

```powershell
   node --env-file=.env.local scripts/provision-staff.mjs <auth-uid> <tenant-id> verifier
```

The tenant ID is visible in the RTDB console. For local provisioning, authenticate with Google Application Default Credentials or set `GOOGLE_APPLICATION_CREDENTIALS` to a protected credential file outside the repository. Provisioning writes the tenant membership, user index, and audit event before setting custom claims. The Vercel API checks both membership and claims and requires staff MFA before returning dashboard data.

## Firebase setup and deployment notes

- Create separate development, staging, and production Firebase projects. Enable Email/Password and Phone multi-factor authentication in Auth; configure an RTDB instance and Cloud Storage bucket.
- In Vercel, set the six `VITE_FIREBASE_*` web settings and the server-only `FIREBASE_SERVICE_ACCOUNT_JSON` for each deployment environment. Use a non-production Firebase project for untrusted preview deployments.
- Import the repository into Vercel with the repository root as the project root. `vercel.json` builds the shared schemas and Vite app, serves the SPA routes, and deploys the `/api` handlers.
- Firebase CLI remains available for RTDB and Storage rule management. Deploy only after reviewing rules, Auth MFA policy, backup/restore, monitoring, legal notices, and data retention for the operating jurisdiction.
- Database and Storage direct client access intentionally stay denied. Add an authorization rule only alongside a bounded read model, emulator tests, and a documented access policy.
- The previous `functions/` source folder is retained as legacy reference only. It is not a workspace dependency, is not configured for Firebase deployment, and is not called by the app. New backend work belongs under `api/` and `server/`.
- The initial account setup endpoint is idempotent for the same client-owner account and creates an empty account record. External identity checks, document ingestion/scanning, staff assignment approvals, email/SMS delivery, valuation providers, and production audit export are unfinished integrations.

## Initial threat model

| Threat | Foundation control | Remaining work |
| --- | --- | --- |
| Forged browser role or tenant ID | Vercel API checks token claims against active RTDB membership on each request | Add granular entity and asset scopes to each future API route |
| Direct client edits or cross-tenant reads | RTDB and Storage default deny; privileged writes use Admin SDK in Vercel API routes | Add emulator rule and API authorization tests before each data feature |
| Staff self-approval | No asset/review mutation endpoint exists in this phase; roles are provisioned outside the UI | Enforce distinct author/reviewer IDs and state/version checks in phase 2 |
| Account takeover | Verified email; staff dashboard calls require enrolled MFA; API access is checked against tenant membership and role | Configure recovery/session policy, rate limits, monitoring, and staff step-up controls |
| Sensitive data exposure | Empty summaries only; no documents or real records seeded; generic errors | Add redaction, private document capabilities, malware scanning, and export audit |
| Audit tampering | Audit entries are written only by trusted Admin SDK paths; client rules deny writes | Add immutable external export and retention controls |

## Assumptions and unfinished scope

- USD is the initial empty-account reporting currency until a tenant settings flow exists.
- One primary tenant is supported per client login in this foundation. Delegated access and multi-entity consolidation require later grant and ownership-graph work.
- The supplied guidance calls out Ghana among possible jurisdictions, but service location and legal scope are unresolved; the app makes no licensing, legal-title, or jurisdictional compliance claim.
- Dashboards contain real zero-state data until secure asset workflows write read models. There is no demo seed data or external registry integration in this phase.
