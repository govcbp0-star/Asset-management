# UI/UX, Brand & Application Routes

## Brand direction
Institutional, discreet, premium. Navy/charcoal foundation, off-white surfaces, restrained champagne-gold accents, clear typography and abundant whitespace. Trust comes from transparent methodology, not decorative “certified” seals.

## Public website
`/` hero, services, how it works, audiences, trust/security overview, CTA; `/services`; `/who-we-serve`; `/how-it-works`; `/about`; `/contact`; `/privacy`; `/terms`; `/disclosures`; `/login`; `/register`.

## Client routes
`/app/overview`; `/app/assets`; `/app/assets/:assetId`; `/app/analytics`; `/app/locations`; `/app/documents`; `/app/reports`; `/app/requests`; `/app/notifications`; `/app/organization`; `/app/settings/security`.

## Staff routes
`/admin/overview`; `/admin/clients`; `/admin/clients/:id`; `/admin/assets`; `/admin/assets/new`; `/admin/assets/:id/edit`; `/admin/onboarding`; `/admin/reviews`; `/admin/valuations`; `/admin/documents`; `/admin/requests`; `/admin/reports`; `/admin/staff`; `/admin/audit`; `/admin/settings`. Reviewer role sees only assigned tools.

## Reusable components
AppShell, Sidebar, TopBar, TenantSwitcher, StatCard, PortfolioValueCard, AllocationChart, JurisdictionChart, AssetTable, AssetStatusPill, VerificationScopePanel, AssetDetailTabs, DocumentViewer, UploadDropzone, ReviewDecisionForm, Timeline, AuditTable, PermissionEditor, CurrencySelector, DateAsOfLabel, EmptyState, ErrorBoundary, ConfirmDialog.

## Interaction requirements
Desktop/tablet/mobile responsive; keyboard and screen-reader accessible; WCAG 2.2 AA target; clear loading, error, empty and permission-denied states; no misleading live-data indicators; privacy-sensitive notifications; confirmation for irreversible actions; no unapproved record exposed as verified. Use realistic demo fixtures clearly marked as fictional.
