import { z } from "zod";
import type { CharacterAggregate } from "./schema";

export const MutationAuthoritySchema = z
  .object({
    actorRole: z.enum(["player", "dm", "admin"]),
    mode: z.enum(["owner", "administrator-override"]),
    reason: z.string().trim().min(10).nullable(),
  })
  .strict()
  .superRefine((authority, context) => {
    if (authority.mode === "administrator-override") {
      if (authority.actorRole !== "admin") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actorRole"],
          message: "Only an administrator can use an administrator override",
        });
      }
      if (authority.reason === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: "Administrator override requires an audit reason",
        });
      }
    } else if (authority.reason !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Owner authorization must not contain an override reason",
      });
    }
  });

export type MutationAuthority = z.infer<typeof MutationAuthoritySchema>;
export type AuthorizationAudit = {
  mode: "owner" | "administrator-override";
  actorRole: "player" | "dm" | "admin";
  overrideReason: string | null;
};

export class CharacterMutationPermissionError extends Error {
  constructor(message = "Actor is not authorized to mutate this character") {
    super(message);
    this.name = "CharacterMutationPermissionError";
  }
}

export function authorizeCharacterMutation(input: {
  character: CharacterAggregate;
  actorUserId: string;
  authority?: MutationAuthority;
}): AuthorizationAudit {
  const authority = MutationAuthoritySchema.parse(
    input.authority ?? { actorRole: "player", mode: "owner", reason: null },
  );
  if (authority.mode === "owner") {
    if (input.actorUserId !== input.character.identity.ownerUserId) {
      throw new CharacterMutationPermissionError(
        "Only the character owner can perform this action",
      );
    }
    return { mode: "owner", actorRole: authority.actorRole, overrideReason: null };
  }
  return {
    mode: "administrator-override",
    actorRole: "admin",
    overrideReason: authority.reason,
  };
}
