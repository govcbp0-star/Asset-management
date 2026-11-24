# Client Portal Specification

## Navigation
Overview; My Assets; Asset Detail; Portfolio Analytics; Locations; Documents; Reports; Requests & Messages; Notifications; Profile & Security; Organization/Family Access (when enabled).

## Overview dashboard
- Greeting, institution branding, client/organization switcher, reporting currency, data-as-of timestamp.
- **Total registered gross asset value** with currency and conversion methodology; not automatically net worth.
- Counts: total assets, ownership evidence reviewed, pending, disputed, stale valuations.
- Asset allocation chart (category); jurisdiction exposure chart; optional historical value trend.
- Recent records and updates; expiring documents; outstanding actions; latest reports.
- Explicit warnings for incomplete portfolios, estimated values and possible entity-level double counting.

## Asset list
Search, filter and sort by class, country, owner/entity, status, valuation date, custodian; table/card views; asset name, registry ID, thumbnail, latest approved valuation, currency, location, owner, status and last update. Pagination and accessible empty/loading/error states.

## Asset detail
- Header: registry ID, name, category, status, last modified.
- Description, identifiers (redacted as needed), acquisition/registration dates.
- Legal owner and related entities; beneficial owner where authorized.
- Location: country, city, optional address/geocoordinates restricted by permission; custodian for financial assets.
- Latest valuation: amount, currency, as-of date, source/method, freshness; historical values.
- Ownership evidence status and reviewer decision scope/date; separate valuation review status.
- Documents list with access checks; audit-friendly activity timeline; request correction action.
- No public share links by default.

## Analytics
Allocation by class and geography, values by legal entity, historical snapshots, concentration, currency exposure. Filters for time, entity and currency. Explain missing values and FX conversions; avoid summing through layered ownership twice.

## Locations
Opt-in private map for physical assets with sufficiently precise and permissioned location; country-level fallback; no exact coordinates for sensitive assets by default. Custodied investments are shown by custodian jurisdiction, not as physical holdings.

## Documents and reports
Protected document viewer/download with server authorization, version/date/source; downloadable dated PDF portfolio statements with visible caveats and record provenance. No unrestricted Storage URLs.

## Requests, notifications, account
Submit asset registration/correction/document requests; view review status; secure staff messages; in-app and optional email notifications without sensitive details; manage MFA, sessions, contact info, access grants, privacy requests.

## Mobile
Responsive cards, accessible navigation, skeleton loaders, charts with text alternatives, currency formatting and timezone-aware timestamps.
