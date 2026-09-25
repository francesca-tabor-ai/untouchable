import { z } from "zod";

/**
 * The Research Scout's one route to Claude.
 *
 * Raw HTTP rather than the Anthropic SDK, and only because `package.json` is a single-writer
 * file (AGENTS.md section 3): adding `@anthropic-ai/sdk` is the platform lead's call. If it is
 * added, this file is the only one that changes.
 *
 * **Off unless configured.** With no `ANTHROPIC_API_KEY` nothing is sent anywhere and every
 * caller falls back to what it can do without a model: the abstract is shown as it is, the
 * study type comes from the index, and the email is a template. The screen says which.
 *
 * **What leaves.** A paper's title and abstract, which are public. For an email draft, also
 * what the person typed into the draft form, which may be about their health — the form says
 * so before they type (DECISIONS.md RS-02). Never an account id, an email address, or
 * anything from the rest of the account.
 *
 * Every response is structured (`output_config.format` with a JSON schema), parsed with Zod,
 * and passed through `language.ts` by the caller before anybody sees it.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-5";
const TIMEOUT_MS = 90_000;

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class ClaudeUnavailableError extends Error {
  constructor(
    readonly reason: "not-configured" | "refused" | "failed" | "malformed",
    detail?: string,
  ) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.name = "ClaudeUnavailableError";
  }
}

interface MessagesResponse {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  error?: { type?: string; message?: string };
}

/**
 * One structured request. `schema` is the JSON schema sent to the API; `parser` is the Zod
 * schema the answer must also pass here, because a response we did not validate is a
 * response we do not show.
 */
export async function askClaude<T>(options: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  parser: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new ClaudeUnavailableError("not-configured");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // If a safety classifier declines, the API retries on its recommended fallback model
        // inside the same call rather than handing back nothing.
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: options.maxTokens ?? 16_000,
        fallbacks: "default",
        system: options.system,
        messages: [{ role: "user", content: options.prompt }],
        output_config: { format: { type: "json_schema", schema: options.schema } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new ClaudeUnavailableError("failed", error instanceof Error ? error.message : undefined);
  }

  const body = (await response.json().catch(() => ({}))) as MessagesResponse;
  if (!response.ok) throw new ClaudeUnavailableError("failed", body.error?.message ?? `HTTP ${response.status}`);
  if (body.stop_reason === "refusal") throw new ClaudeUnavailableError("refused");
  if (body.stop_reason === "max_tokens") throw new ClaudeUnavailableError("malformed", "answer was cut off");

  const text = (body.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ClaudeUnavailableError("malformed", "not JSON");
  }
  const parsed = options.parser.safeParse(json);
  if (!parsed.success) throw new ClaudeUnavailableError("malformed", parsed.error.message);
  return parsed.data;
}
