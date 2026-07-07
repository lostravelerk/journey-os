# Repo review: Storage, Sync & AI endpoints

Purpose: identify code locations to review for "Local First" and "Privacy by Default", plus AI provider safety boundaries.

Summary findings
- Local storage is implemented via `lib/local-store.ts` using IndexedDB (Dexie) with `localStorage` fallbacks. Good local-first baseline.
- Visibility defaults are enforced in `lib/local-store.ts` via `applyConstitutionDefaults` and `lib/journey-factory.ts` defaults to `saveMode: local_private`.
- Client-side intelligence calls go to `/api/intelligence` (`lib/intelligence/intelligence-service.ts`), which proxies to server function `functions/api/intelligence.ts` -> `functions/api/ai.ts` that calls `lib/intelligence/deepseek-provider.ts` with a server-side `DEEPSEEK_API_KEY`.

Files to review (with suggested checks)

- `lib/local-store.ts` ([lib/local-store.ts](lib/local-store.ts))
  - Check photo handling: photos are stored with `localUrl` and fallback strips `localUrl` for localStorage; ensure any sync/export excludes `localUrl` unless explicitly chosen.
  - Confirm visibility normalization (`applyConstitutionDefaults`) aligns with product rule "Privacy by Default" (it currently sets `visibility: "private"` for many items).
  - Suggest adding a comment block near export/import functions (`exportBackupObject` / `importBackupObject`) clarifying what is included in backups and that backups are local files unless the user opts into cloud.

- `lib/schema.ts` ([lib/schema.ts](lib/schema.ts))
  - `Visibility` type is `private | shareable`. Ensure any future new values (e.g., `team`) are handled safely; `normalizeVisibility` in `local-store.ts` maps `team` -> fallback.
  - `SharePolicy` fields default to false; ensure UI for share previews uses these defaults strictly.

- `lib/intelligence/intelligence-service.ts` ([lib/intelligence/intelligence-service.ts](lib/intelligence/intelligence-service.ts))
  - Client calls `/api/intelligence` directly. Add UI consent/intent step before calling any intelligence endpoint (e.g., a small modal: "Generate a suggestion from selected Moment?").
  - Consider gating calls behind user action and rate-limiting on server to prevent accidental bulk exposure.

- `functions/api/ai.ts` ([functions/api/ai.ts](functions/api/ai.ts)) and `functions/api/intelligence.ts` ([functions/api/intelligence.ts](functions/api/intelligence.ts))
  - Ensure environment key `DEEPSEEK_API_KEY` is only defined server-side (we added `.env.example`). Do not expose keys to client bundles.
  - Currently accepts any POST from client; consider adding minimal server-side validation and origin check or a short-lived user token if you expect sensitive usage patterns.
  - Add logging for failures and throttling to protect the provider key and control costs.

- `lib/intelligence/deepseek-provider.ts` ([lib/intelligence/deepseek-provider.ts](lib/intelligence/deepseek-provider.ts))
  - Good: throws when API key missing; enforces `draft: true` in responses. Keep provider-specific prompts minimal as currently done.
  - Suggest sanitizing/limiting length of returned content before exposing to UI, and avoid auto-saving AI results without explicit user confirmation.

- `lib/future-journey-import.ts` ([lib/future-journey-import.ts](lib/future-journey-import.ts))
  - This likely calls intelligence-service; ensure imported material is treated as "Future" (not Memory) until user confirms and that sensitive content is not auto-shared.

Quick recommended actions (small patches)

1. Add an explicit user-consent step in the UI before calling `generateMemoryLine` / `requestJourneyIntelligence` (front-end change in components that call these functions).
2. Add server-side basic rate limiting and request validation in `functions/api/ai.ts` to reject malformed or excessively large requests.
3. Add comments to `lib/local-store.ts` documenting fallback/localStorage behavior and privacy considerations for photo `localUrl` fields.
4. Ensure `.env.example` and `CONTRIBUTING.md` (already added) clearly instruct contributors not to commit keys.
5. Prevent automatic adoption of AI-generated drafts: ensure UI always shows original → suggestion → adopt/edit/ignore flow (enforced in the front-end UI components and tests).

Notes
- Current code already follows many local-first and privacy-by-default patterns; recommended changes are small hardening steps and adding explicit checks/consent.
- If you want, I can implement quick patches: add comments in `lib/local-store.ts`, add a small consent modal stub where intelligence is invoked, and add basic request size check in `functions/api/ai.ts`.
