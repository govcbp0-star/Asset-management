# Firebase Realtime Database Data Model

RTDB is a denormalized JSON tree. Use tenant-scoped indexes and authorization checks. **All values below are examples, not real client data.**

## Suggested paths
```text
/publicConfig/{key}                 # non-sensitive public config
/userProfiles/{uid}                 # minimal profile, auth uid is source of identity
/tenants/{tenantId}/profile
/tenants/{tenantId}/members/{uid}   # membership and limited role metadata
/tenants/{tenantId}/entities/{entityId}
/tenants/{tenantId}/assets/{assetId}
/tenants/{tenantId}/assetVersions/{assetId}/{versionId}
/tenants/{tenantId}/valuations/{assetId}/{valuationId}
/tenants/{tenantId}/reviews/{reviewId}
/tenants/{tenantId}/documentMetadata/{docId}
/tenants/{tenantId}/requests/{requestId}
/tenants/{tenantId}/notifications/{uid}/{notificationId}
/tenants/{tenantId}/accessGrants/{grantId}
/tenants/{tenantId}/reports/{reportId}
/tenants/{tenantId}/audit/{eventId}
/userTenantIndex/{uid}/{tenantId}   # server-maintained minimal membership index
```

## Example asset record
```json
{
  "id": "ast_01JEXAMPLE",
  "registryId": "PWR-2026-000001",
  "tenantId": "ten_example",
  "legalOwnerEntityId": "ent_example",
  "name": "Residential Property",
  "category": "real_estate",
  "description": "Illustrative property",
  "location": {"countryCode": "GH", "city": "Accra", "precision": "city"},
  "recordStatus": "active",
  "ownershipEvidenceStatus": "evidence_reviewed",
  "valuationStatus": "client_reported",
  "latestValuationId": "val_example",
  "currentVersion": 3,
  "createdAt": 1790000000000,
  "updatedAt": 1790000000000
}
```

## Example valuation
```json
{
  "id": "val_example",
  "assetId": "ast_01JEXAMPLE",
  "amountMinor": "250000000",
  "currency": "USD",
  "asOfDate": "2026-11-20",
  "sourceType": "client_declaration",
  "methodology": "reported",
  "approvalStatus": "recorded",
  "evidenceDocumentIds": [],
  "createdBy": "uid_example"
}
```

Use decimal-safe monetary representation (integer minor units as strings or dedicated decimal processing), never binary floating-point for financial calculations. Record currency precision. Store FX rate, source and as-of time for conversions.

## Example document metadata
```json
{
  "id": "doc_example",
  "assetId": "ast_01JEXAMPLE",
  "storagePath": "tenants/ten_example/assets/ast_01JEXAMPLE/doc_example/v1.pdf",
  "classification": "ownership_evidence",
  "status": "pending_review",
  "uploadedBy": "uid_example",
  "createdAt": 1790000000000
}
```

## Modeling notes
- Assets belong to **tenants** and reference **legal-owner entities**; individual login users are not necessarily legal owners.
- Multiple entity interests can reference the same underlying asset; use ownership edges and consolidation rules in phase 2.
- Store only metadata in RTDB; documents live in private Cloud Storage.
- Never store passports, credentials, payment card details or private keys in RTDB plaintext.
- Use server-generated IDs and timestamps, stable immutable IDs and revision history.
- Denormalized indexes: `/tenantAssetByCategory/{tenantId}/{category}/{assetId}`, `/tenantAssetsByOwner/...`, `/reviewQueueByStatus/...`; maintained atomically by trusted functions.
- Declare `.indexOn` for queried fields; avoid unbounded reads, large client-side joins and whole-database listeners.
- Client dashboard aggregates should be computed server-side or safely materialized, with freshness timestamps and correct entitlement filters.
