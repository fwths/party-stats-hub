import { z } from "zod";
import { CharacterAggregateSchema } from "./schema";

const Identifier = z.string().trim().min(1).max(500);
const NonEmptyString = z.string().trim().min(1);

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const AuthorizationAuditSchema = z
  .object({
    mode: z.enum(["owner", "administrator-override"]),
    actorRole: z.enum(["player", "dm", "admin"]),
    overrideReason: z.string().trim().min(10).nullable(),
  })
  .strict()
  .superRefine((authorization, context) => {
    if (authorization.mode === "administrator-override") {
      if (authorization.actorRole !== "admin") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actorRole"],
          message: "Administrator override requires the admin role",
        });
      }
      if (authorization.overrideReason === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overrideReason"],
          message: "Administrator override requires an audit reason",
        });
      }
    } else if (authorization.overrideReason !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overrideReason"],
        message: "Owner authorization cannot contain an override reason",
      });
    }
  });

export const CharacterMutationEventInputSchema = z
  .object({
    mutationId: Identifier,
    actorUserId: Identifier,
    characterId: Identifier,
    type: NonEmptyString.max(200),
    authorization: AuthorizationAuditSchema,
    details: z.record(JsonValueSchema),
  })
  .strict();

export const CharacterRevisionPairSchema = z
  .object({
    build: z.number().int().min(1),
    liveState: z.number().int().min(0),
  })
  .strict();

export const CommitCharacterMutationInputSchema = z
  .object({
    expectedRevision: CharacterRevisionPairSchema,
    character: CharacterAggregateSchema,
    event: CharacterMutationEventInputSchema,
  })
  .strict();

export const InitializeCharacterInputSchema = z
  .object({
    character: CharacterAggregateSchema,
    event: CharacterMutationEventInputSchema.refine(
      (event) => event.type === "initialize-character-v3",
      "Initialization must use the initialize-character-v3 event type",
    ),
  })
  .strict();

export const PersistedCharacterMutationSchema = z
  .object({
    sequence: z.number().int().positive(),
    mutationId: Identifier,
    characterId: Identifier,
    campaignId: Identifier,
    actorUserId: Identifier,
    type: NonEmptyString.max(200),
    authorization: AuthorizationAuditSchema,
    expectedRevision: CharacterRevisionPairSchema.nullable(),
    resultingRevision: CharacterRevisionPairSchema,
    details: z.record(JsonValueSchema),
    resultingCharacter: CharacterAggregateSchema,
    resultingAggregateChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    committedAt: z.number().int().nonnegative(),
  })
  .strict();

export type CharacterMutationEventInput = z.infer<typeof CharacterMutationEventInputSchema>;
export type PersistedCharacterMutation = z.infer<typeof PersistedCharacterMutationSchema>;
