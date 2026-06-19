import { randomUUID } from "node:crypto";

const SESSION_COOKIE_NAME = "mob_session_id";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

type LoginAttempt = {
  failures: number;
  resetAt: number;
  lockedUntil: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

export function getPasscode(): string {
  const passcode = process.env.PARTY_PASSCODE;
  if (!passcode) {
    throw new Error("PARTY_PASSCODE environment variable is required");
  }
  return passcode;
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  header.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
  return cookies;
}

export function getSessionIdFromHeaders(headers: Headers): string | null {
  const cookieHeader = headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export async function isAuthenticated(_headers: Headers): Promise<boolean> {
  // Login requirement disabled for now
  return true;
}

export function verifyPasscode(_passcode: string): boolean {
  // Passcode requirement disabled for now
  return true;
}

function getLoginRateLimitKey(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip") || "local";
}

function getActiveLoginAttempt(key: string, now = Date.now()): LoginAttempt | null {
  const attempt = loginAttempts.get(key);
  if (!attempt) return null;

  if (attempt.resetAt <= now && attempt.lockedUntil <= now) {
    loginAttempts.delete(key);
    return null;
  }

  return attempt;
}

export function assertLoginAllowed(headers: Headers): void {
  const key = getLoginRateLimitKey(headers);
  const attempt = getActiveLoginAttempt(key);
  if (attempt && attempt.lockedUntil > Date.now()) {
    throw new Error("Too many failed passcode attempts. Please try again later.");
  }
}

export function recordLoginAttempt(headers: Headers, success: boolean): void {
  const key = getLoginRateLimitKey(headers);
  if (success) {
    loginAttempts.delete(key);
    return;
  }

  const now = Date.now();
  const existing = getActiveLoginAttempt(key, now);
  const failures = (existing?.failures || 0) + 1;
  loginAttempts.set(key, {
    failures,
    resetAt: now + LOGIN_WINDOW_MS,
    lockedUntil: failures >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCK_MS : 0,
  });
}

export async function startSession(
  expiresInDays = 30,
): Promise<{ id: string; expiresAt: number; cookieString: string }> {
  // Generate a cryptographically random session token
  const sessionId = randomUUID();

  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

  const { createSession } = await import("./db.server");
  await createSession(sessionId, expiresAt);

  const expiryDate = new Date(expiresAt).toUTCString();
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookieString = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${expiryDate}; HttpOnly; SameSite=Lax${secureFlag}`;

  return { id: sessionId, expiresAt, cookieString };
}

export async function destroySession(headers: Headers): Promise<string> {
  const sessionId = getSessionIdFromHeaders(headers);
  if (sessionId) {
    const { deleteSession } = await import("./db.server");
    await deleteSession(sessionId);
  }
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`;
}
