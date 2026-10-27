import { UserAgent } from "@std/http/user-agent";
import { duration } from "../utils.ts";

export interface Session {
  createdAt: number;
  lastAccessedAt: number;
  userAgent?: string;
  forwardedIP?: string;
  flash?: Record<string, string>;
  csrf?: string;
}

export interface SessionData extends Session {
  [key: string]: unknown;
}

export const SESSION_TTL_MS = duration({ hours: 1 });

/**
 * creates a new session kv entry. returns the newly created session id.
 * throws error if the `Deno.KvCommitResult.ok` value is false.
 *
 * @param request
 * @param store
 * @param data
 * @throws {Error}
 * @returns {Promise<string>}
 */
export async function createSession(
  request: Request,
  store: Deno.Kv,
  data?: SessionData,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const headers = request.headers;
  const userAgent = new UserAgent(headers.get("user-agent")).ua;
  const forwardedIP = headers.get("x-forwarded-for")?.toString();
  const session: Session = {
    createdAt: now.epochMilliseconds,
    lastAccessedAt: now.epochMilliseconds,
    userAgent,
    forwardedIP,
    ...data,
  };
  const result = await store.set(["sessions", id], session, {
    expireIn: SESSION_TTL_MS,
  });
  if (!result.ok) {
    throw new Error("An error occured during save of session data.");
  }
  return id;
}
