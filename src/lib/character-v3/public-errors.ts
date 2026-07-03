export const CHARACTER_V3_ERROR_CODES = [
  "AUTHENTICATION_REQUIRED",
  "NOT_CAMPAIGN_MEMBER",
  "NOT_CHARACTER_OWNER",
  "REVISION_CONFLICT",
  "MUTATION_ID_REUSED",
  "VALIDATION_FAILED",
] as const;

export type CharacterV3ErrorCode = (typeof CHARACTER_V3_ERROR_CODES)[number];

const PREFIX = "CHARACTER_V3_ERROR";

export function characterV3PublicError(code: CharacterV3ErrorCode, message: string): Error {
  return new Error(`${PREFIX}:${code}:${message}`);
}

export function parseCharacterV3PublicError(error: unknown): {
  code: CharacterV3ErrorCode;
  message: string;
} | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = new RegExp(`^${PREFIX}:(${CHARACTER_V3_ERROR_CODES.join("|")}):(.*)$`, "s").exec(
    message,
  );
  return match ? { code: match[1] as CharacterV3ErrorCode, message: match[2] } : null;
}
