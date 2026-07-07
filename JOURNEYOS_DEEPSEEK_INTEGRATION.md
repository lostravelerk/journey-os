# JourneyOS DeepSeek API Integration V1

DeepSeek is connected only as a quiet intelligence layer.

It is not the product. Moment is the product.

## Security

- Do not expose `DEEPSEEK_API_KEY` in browser code.
- Store the key in Cloudflare Pages environment variables.
- Frontend calls only the local project endpoint: `/api/ai`.
- Cloudflare Pages Function `functions/api/ai.ts` forwards requests to DeepSeek.

## Static Deployment Note

JourneyOS uses Next.js static export:

```js
output: "export"
```

Because of that, API routes under `app/api` are intentionally not used. Cloudflare Pages Functions provide the API layer without breaking static export.

## Supported V1 Tasks

- Generate Memory Line
- Organize Moment reflection
- Suggest Future Journey inspiration
- Parse imported journey text
- Draft Story text

No AI chat. No AI dashboard. No AI assistant page.

## Environment Variables

Cloudflare Pages:

```bash
DEEPSEEK_API_KEY=your_key
```

Local development:

```bash
DEEPSEEK_API_KEY=your_key
```

Place local values in `.env.local`. This file is ignored by Git.

## Data Principle

AI only handles content the user explicitly submits.

AI output is always an AI-generated draft. The user must confirm before it becomes part of a Moment, Memory, Future Journey, or Story.

## Failure Principle

If AI fails, JourneyOS still works.

Moment capture, local storage, photos, notes, and future journey import must remain usable without AI.

Final principle:

AI helps remember the Moment. AI never replaces the Moment.
