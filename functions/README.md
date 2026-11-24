# Legacy Firebase Functions

This folder contains the initial Firebase Functions implementation. The active app has moved its account setup and dashboard endpoints to Vercel API routes under `/api`.

The root npm workspace, browser SDK, and `firebase.json` no longer build, call, or deploy this folder. Keep it as historical reference during the migration; new server code belongs in the root `api/` and `server/` folders.
