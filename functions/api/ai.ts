import { runDeepSeekAi } from "../../lib/ai/deepseek-provider";
import { isAiRequest } from "../../lib/ai/types";

type Env = {
  DEEPSEEK_API_KEY?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...responseHeaders,
      ...(init?.headers ?? {})
    }
  });
}

export async function onRequest(context: PagesContext) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders
    });
  }

  if (context.request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAiRequest(payload)) {
    return jsonResponse({ error: "Invalid AI request" }, { status: 400 });
  }

  try {
    return jsonResponse(await runDeepSeekAi(payload, context.env.DEEPSEEK_API_KEY, fetch));
  } catch {
    return jsonResponse(
      {
        error: "AI temporarily unavailable",
        fallback: "稍后再整理也可以。"
      },
      { status: 503 }
    );
  }
}
