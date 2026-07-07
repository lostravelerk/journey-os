# Contributing to JourneyOS

Thank you for contributing. JourneyOS follows a small set of product-first rules — please respect the constitution when proposing changes.

Required for every PR
- **Memory Impact**: One-line summary — how does this change preserve or improve memory clarity?
- **Privacy Check**: Any data surfaced by this change must remain private by default. Note if sharing or sync is introduced.
- **Local-First**: Confirm default behavior is local/offline-first; cloud sync must be opt-in and documented.

Code style & tests
- Run `pnpm install` then `pnpm dev` to run locally.
- Follow existing TypeScript and formatting patterns. Keep changes minimal and focused.

PR process
- Open a descriptive PR with the three required fields above in the description.
- Keep UI changes small and justify with the "3-second comprehension" acceptance check (can a user understand the screen within 3 seconds?).

Security & keys
- Do not commit secrets. Use `.env` locally and rely on environment variables in CI.
- Server-only API keys must not be exposed to the browser. See `.env.example`.

Design & product
- Design changes should reference `JOURNEYOS_CONSTITUTION.md` and the "Four elements" priority: Time, Place, Photo, Memory.
- Avoid adding features that increase UI noise. Prefer hiding, merging, or delaying non-essential controls.
