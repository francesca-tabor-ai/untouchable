/**
 * Every call the Research Scout makes to somebody else's server goes through here.
 *
 * Three jobs:
 *
 * **Cache.** The same question asked twice in an afternoon should not reach PubMed twice. The
 * prompt asks for it, the APIs' terms ask for it, and it is kinder to a person refreshing a
 * page at 2am on a slow connection. Held in memory on the server, keyed by URL, for a few
 * hours. Nothing about who asked is part of the key or the value.
 *
 * **Politeness.** NCBI allows three requests a second without a key, ten with one, and wants a
 * `tool` name and a contact `email` on every call. OpenAlex asks for a `mailto` to put you in
 * its polite pool. The contact address is the operator's (`SCOUT_CONTACT_EMAIL`), never the
 * person using the tool.
 *
 * **A deadline.** A slow registry must not hang the page. Every request gives up after
 * fifteen seconds and the caller says which source did not answer.
 */

const TIMEOUT_MS = 15_000;
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

interface Entry {
  expires: number;
  value: unknown;
}

const cache = new Map<string, Entry>();

export function clearScoutCache() {
  cache.clear();
}

function remember(key: string, value: unknown, ttl: number) {
  if (cache.size >= MAX_ENTRIES) {
    // Oldest first: a Map iterates in insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + ttl, value });
}

export async function cached<T>(key: string, load: () => Promise<T>, ttl = DEFAULT_TTL_MS): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  remember(key, value, ttl);
  return value;
}

export class SourceUnavailableError extends Error {
  constructor(
    readonly source: string,
    detail: string,
  ) {
    super(`${source}: ${detail}`);
    this.name = "SourceUnavailableError";
  }
}

/**
 * Requests to NCBI are spaced out one after another, never fired together. Without a key the
 * ceiling is three a second; with `NCBI_API_KEY` it is ten.
 */
let ncbiQueue: Promise<unknown> = Promise.resolve();
let ncbiLast = 0;

function ncbiSpacing() {
  return process.env.NCBI_API_KEY ? 110 : 350;
}

export function throttleNcbi<T>(run: () => Promise<T>): Promise<T> {
  const next = ncbiQueue.then(async () => {
    const wait = ncbiLast + ncbiSpacing() - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    ncbiLast = Date.now();
    return run();
  });
  ncbiQueue = next.catch(() => undefined);
  return next;
}

export function contactEmail(): string | null {
  const email = process.env.SCOUT_CONTACT_EMAIL?.trim();
  return email ? email : null;
}

async function request(source: string, url: string, accept: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": "UnTouchable-ResearchScout/0.1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new SourceUnavailableError(source, error instanceof Error ? error.message : "no response");
  }
  if (!response.ok) throw new SourceUnavailableError(source, `HTTP ${response.status}`);
  return response;
}

export function getJson<T>(source: string, url: string, ttl?: number): Promise<T> {
  return cached(`json:${url}`, async () => (await request(source, url, "application/json")).json() as Promise<T>, ttl);
}

export function getText(source: string, url: string, ttl?: number): Promise<string> {
  return cached(`text:${url}`, async () => (await request(source, url, "application/xml, text/xml, */*")).text(), ttl);
}
