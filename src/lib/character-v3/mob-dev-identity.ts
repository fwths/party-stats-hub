export const MOB_DEV_IDENTITY_COOKIE = "mob_v3_dev_actor";

export const MOB_DEV_ACTOR_IDS = [
  "qemuel",
  "nikos",
  "eleni",
  "alexia",
  "andreas",
  "danny",
] as const;

export type MobDevActorId = (typeof MOB_DEV_ACTOR_IDS)[number];

export function isMobDevActorId(value: unknown): value is MobDevActorId {
  return typeof value === "string" && MOB_DEV_ACTOR_IDS.includes(value as MobDevActorId);
}

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const trimmed = part.trim();
    if (!trimmed) return cookies;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return cookies;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) return cookies;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
    return cookies;
  }, {});
}

export function selectedMobDevActor(cookieHeader: string | null | undefined): MobDevActorId | null {
  const selected = parseCookieHeader(cookieHeader)[MOB_DEV_IDENTITY_COOKIE];
  return isMobDevActorId(selected) ? selected : null;
}

export function isMobDevIdentityEnabled(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}

export function resolveV3ActorUserId({
  sessionUserId,
  cookieHeader,
  nodeEnv,
}: {
  sessionUserId: string | null | undefined;
  cookieHeader: string | null | undefined;
  nodeEnv?: string;
}): string | null {
  if (!sessionUserId) return null;
  if (sessionUserId !== "default-user") return sessionUserId;
  if (!isMobDevIdentityEnabled(nodeEnv)) return null;
  return selectedMobDevActor(cookieHeader);
}

export function mobDevIdentityCookie(
  actorUserId: MobDevActorId,
  maxAgeSeconds = 60 * 60 * 24 * 30,
) {
  return `${MOB_DEV_IDENTITY_COOKIE}=${encodeURIComponent(
    actorUserId,
  )}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}
