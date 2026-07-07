# JourneyOS

Local-first personal journey memory system. The current seed data is Reference Journey 01: USA Business Road Trip 2026.

## Core Product Documents

- `JOURNEYOS_CONSTITUTION.md`
- `JOURNEYOS_CORE_SYSTEM.md`
- `JOURNEYOS_DESIGN_BIBLE.md`
- `JOURNEYOS_EXPERIENCE_KERNEL.md`
- `JOURNEYOS_MOMENT_QUALITY_FRAMEWORK.md`

## MVP Scope

- No login required.
- Trip data persists locally in IndexedDB with a localStorage mirror.
- The built-in 22-day reference journey is persisted locally and can be edited in the browser.
- Core flow: horizontal time scale, one Moment per screen, vertical Moment detail expansion, optional Share page, and HTML Travel Book export.
- Sharing and share-safe Travel Book exports hide hotels, flights, exact GPS, expenses, private notes, and business contacts by default.
- Product architecture is generic Journey-first. The USA Business Road Trip is Reference Journey 01, implemented as seed/mock data only.

## Architecture

- Domain layer: `lib/domain.ts`
- Application engines: `lib/engines/*`
- Legacy storage compatibility: `lib/schema.ts`, `lib/local-store.ts`
- Reference journey adapter: `lib/journey-adapter.ts`

## Run

Use the bundled Codex runtime if your shell does not have Node.js:

```bash
/Users/coady/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm install
/Users/coady/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dev
```

## Key Routes

- `/` Moment time scale
- `/journeys` Journey list
- `/calendar` Travel calendar
- `/day?day={id}` Daily journey page
- `/share` Optional memory sharing and privacy review
- `/story?story={id}` Generated story view
- `/travel-book` HTML Travel Book export

## Deployment

JourneyOS is configured for static export and Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `out`
- Environment variables: none
- Data storage: browser IndexedDB with localStorage fallback
- No login, server database, cloud sync, or AI API
