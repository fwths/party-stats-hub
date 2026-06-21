import { createHash } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = "mother-of-bob-salt-key-92834";
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}
