/**
 * How many Claude requests one person can make in an hour.
 *
 * Generous for somebody reading — a summary per paper as they open it — and a ceiling for
 * anything that is not somebody reading. Held in memory on the server, keyed by account id,
 * and forgotten after the hour. It is a brake, not a record.
 */

const WINDOW_MS = 60 * 60 * 1000;
export const CLAUDE_REQUESTS_PER_HOUR = 60;

const windows = new Map<string, number[]>();

export function takeClaudeRequest(userId: string, now = Date.now()): boolean {
  const recent = (windows.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= CLAUDE_REQUESTS_PER_HOUR) {
    windows.set(userId, recent);
    return false;
  }
  recent.push(now);
  windows.set(userId, recent);
  return true;
}

export function resetClaudeLimits() {
  windows.clear();
}
