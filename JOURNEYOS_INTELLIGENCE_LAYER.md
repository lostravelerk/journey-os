# JourneyOS Intelligence Layer V1

JourneyOS is not an AI product.

JourneyOS is:

- Reality first
- Moment first
- Journey second
- Memory forever

Intelligence is only a quiet layer that helps the user understand, refine, and continue their journey.

## Current Scope

V1 supports only two intelligence abilities:

1. Memory Refine
2. Future Journey Understanding

Nothing else should be promoted into product surface yet.

## Memory Refine

When the user chooses `留下这一刻`, JourneyOS saves the user's original words first.

The intelligence layer may suggest a refined Memory Line, but it must never replace the original automatically.

Flow:

```text
User original
↓
Intelligence suggestion
↓
Adopt / Edit / Ignore
```

The original user record remains the source of truth.

## Future Journey Understanding

The user does not “upload a file” as a tool action.

The product language is:

```text
带入旅程
```

Supported inputs may include:

- Excel
- PDF
- screenshots
- images
- text
- email content

The intelligence layer turns messy future material into Future Moments.

Future Moments are not memories. They are changeable possibilities.

## Provider Boundary

JourneyOS calls an Intelligence Layer.

DeepSeek is only the first provider.

Future providers may include:

- DeepSeek
- OpenAI
- Claude
- Gemini
- local models

JourneyOS product logic should not depend on a specific provider.

## Endpoint

Frontend calls:

```text
/api/intelligence
```

`/api/ai` remains only as a compatibility endpoint.

API keys must never be exposed in the browser.

## Security

Store provider keys in Cloudflare environment variables:

```bash
DEEPSEEK_API_KEY=your_key
```

Local development can use `.env.local`, which is ignored by Git.

## Product Rules

Do not build:

- AI chat
- AI assistant page
- AI dashboard
- AI-led journey planning

AI output is always a draft.

The user confirms before it becomes part of JourneyOS.

## Local First

JourneyOS stores user data locally:

- Moment
- Journey
- Memory
- Story
- Journey Book

The intelligence layer only performs temporary understanding.

Final principle:

```text
Reality creates Moments.
JourneyOS preserves them.
Intelligence quietly helps.
```
