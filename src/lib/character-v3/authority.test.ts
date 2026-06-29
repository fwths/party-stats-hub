import { describe, expect, it } from "vitest";
import { authorizeCharacterMutation, CharacterMutationPermissionError } from "./authority";
import type { CharacterAggregate } from "./schema";

const character = {
  identity: { ownerUserId: "alexia" },
} as CharacterAggregate;

describe("Character V3 mutation authority", () => {
  it("allows the owner without an override", () => {
    expect(authorizeCharacterMutation({ character, actorUserId: "alexia" })).toEqual({
      mode: "owner",
      actorRole: "player",
      overrideReason: null,
    });
  });

  it("rejects another player and the DM", () => {
    expect(() => authorizeCharacterMutation({ character, actorUserId: "qemuel" })).toThrow(
      CharacterMutationPermissionError,
    );
    expect(() =>
      authorizeCharacterMutation({
        character,
        actorUserId: "danny",
        authority: { actorRole: "dm", mode: "administrator-override", reason: "DM correction." },
      }),
    ).toThrow(/Only an administrator/);
  });

  it("allows an explicit, reasoned administrator override", () => {
    expect(
      authorizeCharacterMutation({
        character,
        actorUserId: "qemuel",
        authority: {
          actorRole: "admin",
          mode: "administrator-override",
          reason: "Creator-approved migration of imported party data.",
        },
      }),
    ).toEqual({
      mode: "administrator-override",
      actorRole: "admin",
      overrideReason: "Creator-approved migration of imported party data.",
    });
  });

  it("rejects an unreasoned administrator override", () => {
    expect(() =>
      authorizeCharacterMutation({
        character,
        actorUserId: "qemuel",
        authority: { actorRole: "admin", mode: "administrator-override", reason: null },
      }),
    ).toThrow(/requires an audit reason/);
  });
});
