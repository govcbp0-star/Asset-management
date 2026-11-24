# Private Wealth Registry — Project Blueprint

A private, permissioned asset registry and portfolio intelligence platform for high-net-worth individuals, companies and family offices. **Not** a public ownership search engine, government title registry, custodian, or licensed investment manager by default.

## Mission
Provide secure, professionally maintained records of client assets, supporting evidence, valuations, geographic exposure and verification status. Clients self-register and onboard; authorized staff enter assets; independent reviewers approve evidence-backed verification.

## Core principles
- Privacy by default; strict tenant isolation and least privilege.
- Separate **recorded**, **ownership evidence reviewed**, and **valuation independently assessed** statuses.
- Never suggest institutional verification equals legal title certification.
- Track source, effective date, currency and method for every valuation.
- Preserve auditable changes and correction history.
- Do not take custody of assets or give regulated investment advice without proper authorization.

## Documentation index
1. [Product & services](01-PRODUCT-AND-SERVICES.md)
2. [Roles & user journeys](02-ROLES-AND-WORKFLOWS.md)
3. [Client portal](03-CLIENT-PORTAL.md)
4. [Admin & verification portals](04-ADMIN-AND-VERIFICATION.md)
5. [Data architecture](05-DATA-MODEL.md)
6. [Technology & system architecture](06-TECHNICAL-ARCHITECTURE.md)
7. [Security & compliance](07-SECURITY-AND-COMPLIANCE.md)
8. [UI/UX & routes](08-UI-UX-AND-ROUTES.md)
9. [Roadmap & acceptance](09-ROADMAP-AND-ACCEPTANCE.md)
10. [Business & operations](10-BUSINESS-AND-OPERATIONS.md)
11. [Build prompt](11-BUILD-PROMPT.md)

## Stack
Vite + React + TypeScript + Tailwind CSS; Firebase Authentication, Realtime Database, Cloud Storage and App Check; Vercel static hosting and serverless API routes with the Firebase Admin SDK. RTDB is the initial operational store; the Vercel API owns privileged writes. This is the implementation's deployment adaptation of the original build prompt.

## Delivery scope
Start with a secure MVP; sophisticated wealth analytics, external registry integrations, valuations automation, and regulated wealth-management services are future phases.
