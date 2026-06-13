const SESSION_COOKIE_NAME = "mob_session_id";
const DEFAULT_PASSCODE = "criticalfail";

export function getPasscode(): string {
  // Retrieve passcode from environment variable, falling back to default
  return process.env.PARTY_PASSCODE || DEFAULT_PASSCODE;
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

export async function isAuthenticated(headers: Headers): Promise<boolean> {
  const sessionId = getSessionIdFromHeaders(headers);
  if (!sessionId) return false;
  const { isSessionValid } = await import("./db.server");
  return await isSessionValid(sessionId);
}

export function verifyPasscode(passcode: string): boolean {
  if (!passcode) return false;
  const expected = getPasscode();
  return passcode.trim() === expected.trim();
}

export async function startSession(expiresInDays = 30): Promise<{ id: string; expiresAt: number; cookieString: string }> {
  // Generate a cryptographically random session token
  let sessionId: string;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    sessionId = crypto.randomUUID();
  } else {
    sessionId =
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);
  }

  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;

  const { createSession } = await import("./db.server");
  await createSession(sessionId, expiresAt);

  const expiryDate = new Date(expiresAt).toUTCString();
  const cookieString = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${expiryDate}; HttpOnly; SameSite=Lax`;

  return { id: sessionId, expiresAt, cookieString };
}

export async function destroySession(headers: Headers): Promise<string> {
  const sessionId = getSessionIdFromHeaders(headers);
  if (sessionId) {
    const { deleteSession } = await import("./db.server");
    await deleteSession(sessionId);
  }
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
