import { describe, expect, it } from "vitest";
import {
  MOB_DEV_IDENTITY_COOKIE,
  isMobDevIdentityEnabled,
  mobDevIdentityCookie,
  parseCookieHeader,
  resolveV3ActorUserId,
  selectedMobDevActor,
} from "./mob-dev-identity";

describe("MOB dev identity helpers", () => {
  it("parses cookie headers without losing values containing equals signs", () => {
    expect(parseCookieHeader("a=1; token=abc=def; empty=; spaced = willow")).toEqual({
      a: "1",
      token: "abc=def",
      empty: "",
      spaced: "willow",
    });
  });

  it("accepts only explicit Mother of Bob diagnostic actors", () => {
    expect(selectedMobDevActor(`${MOB_DEV_IDENTITY_COOKIE}=alexia`)).toBe("alexia");
    expect(selectedMobDevActor(`${MOB_DEV_IDENTITY_COOKIE}=stranger`)).toBeNull();
    expect(selectedMobDevActor("other=qemuel")).toBeNull();
  });

  it("resolves real authenticated users before diagnostic actors", () => {
    expect(
      resolveV3ActorUserId({
        sessionUserId: "real-user-id",
        cookieHeader: `${MOB_DEV_IDENTITY_COOKIE}=qemuel`,
      }),
    ).toBe("real-user-id");
  });

  it("requires an explicit diagnostic actor for the placeholder local user", () => {
    expect(
      resolveV3ActorUserId({
        sessionUserId: "default-user",
        cookieHeader: `${MOB_DEV_IDENTITY_COOKIE}=qemuel`,
      }),
    ).toBe("qemuel");
    expect(resolveV3ActorUserId({ sessionUserId: "default-user", cookieHeader: null })).toBeNull();
  });

  it("disables placeholder diagnostic identities in production", () => {
    expect(isMobDevIdentityEnabled("development")).toBe(true);
    expect(isMobDevIdentityEnabled("test")).toBe(true);
    expect(isMobDevIdentityEnabled("production")).toBe(false);
    expect(
      resolveV3ActorUserId({
        sessionUserId: "default-user",
        cookieHeader: `${MOB_DEV_IDENTITY_COOKIE}=qemuel`,
        nodeEnv: "production",
      }),
    ).toBeNull();
  });

  it("builds the diagnostic identity cookie", () => {
    expect(mobDevIdentityCookie("nikos", 60)).toBe(
      `${MOB_DEV_IDENTITY_COOKIE}=nikos; Path=/; Max-Age=60; SameSite=Lax`,
    );
  });
});
