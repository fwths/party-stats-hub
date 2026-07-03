import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MOB_LOGIN_IDENTITIES: Record<string, { id: string; role: "admin" | "player" | "dm" }> = {
  fotis: { id: "qemuel", role: "admin" },
  nikos: { id: "nikos", role: "player" },
  eleni: { id: "eleni", role: "player" },
  alexia: { id: "alexia", role: "player" },
  andreas: { id: "andreas", role: "player" },
  danny: { id: "danny", role: "dm" },
};

// Server function to verify authentication status
export const checkAuthFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const { getUserIdFromSession } = await import("./db.server");
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq } = await import("drizzle-orm");

    const headers = getRequestHeaders();
    const userId = await getUserIdFromSession(headers.get("cookie") ?? "");
    if (!userId) return { authenticated: false, user: null };

    const users = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

    if (!users.length) return { authenticated: false, user: null };

    return {
      authenticated: true,
      user: {
        id: users[0].id,
        username: users[0].username,
        role: users[0].role,
      },
    };
  } catch (err) {
    console.error("checkAuthFn error:", err);
    return {
      authenticated: false,
      user: null,
    };
  }
});

// Server function to authenticate via passcode/username
export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().min(2).max(50),
      password: z.string().min(4).max(50),
      passcode: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { getRequestHeaders } = await import("@tanstack/react-start/server");
      const headers = getRequestHeaders();
      const {
        assertLoginAllowed,
        recordLoginAttempt,
        verifyPasscode,
        verifyMotherOfBobClaimToken,
        startSession,
      } =
        await import("@/lib/auth.server");
      const { db } = await import("./drizzle.server");
      const { and, eq } = await import("drizzle-orm");
      const schema = await import("../db/schema");
      const { hashPassword } = await import("./auth-utils");
      const { randomUUID } = await import("node:crypto");

      assertLoginAllowed(headers);

      const username = data.username.trim().toLowerCase();
      const password = data.password;
      const reservedIdentity = MOB_LOGIN_IDENTITIES[username];

      // Find user
      const usersList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);

      let targetUser: any = null;
      let claimedNow = false;

      if (usersList.length > 0) {
        // User exists, verify password
        const user = usersList[0];
        const computedHash = hashPassword(password);
        if (user.passwordHash === "") {
          const claimAuthorized =
            Boolean(data.passcode) &&
            (reservedIdentity
              ? verifyMotherOfBobClaimToken(username, data.passcode!)
              : verifyPasscode(data.passcode!));
          if (!claimAuthorized) {
            recordLoginAttempt(headers, false);
            throw new Error(
              reservedIdentity
                ? "Use your private account claim token to claim this party account"
                : "Use the campaign passcode to claim this account",
            );
          }
          const claim = await db
            .update(schema.users)
            .set({ passwordHash: computedHash })
            .where(and(eq(schema.users.id, user.id), eq(schema.users.passwordHash, "")));
          if (claim.changes !== 1) {
            recordLoginAttempt(headers, false);
            throw new Error("This account was already claimed. Sign in with its existing password.");
          }
          claimedNow = true;
          targetUser = { ...user, passwordHash: computedHash };
        } else if (user.passwordHash !== computedHash) {
          recordLoginAttempt(headers, false);
          throw new Error("Invalid username or password");
        } else {
          targetUser = user;
        }
      } else {
        // User doesn't exist, register them on the fly if passcode is provided and correct
        if (!data.passcode) {
          throw new Error(
            "User does not exist. A valid campaign passcode is required to register.",
          );
        }
        const isPasscodeValid = reservedIdentity
          ? verifyMotherOfBobClaimToken(username, data.passcode)
          : verifyPasscode(data.passcode);
        if (!isPasscodeValid) {
          recordLoginAttempt(headers, false);
          throw new Error("Invalid campaign passcode for registration");
        }

        // Register new user
        const newUserId = reservedIdentity?.id ?? randomUUID();
        const computedHash = hashPassword(password);
        const newUser = {
          id: newUserId,
          username,
          passwordHash: computedHash,
          role: reservedIdentity?.role ?? "player",
          createdAt: Date.now(),
        };

        await db.insert(schema.users).values(newUser);
        targetUser = newUser;
      }

      recordLoginAttempt(headers, true);

      // Create session
      if (claimedNow) {
        const { deleteSessionsForUser } = await import("./db.server");
        await deleteSessionsForUser(targetUser.id);
      }
      const { cookieString } = await startSession(targetUser.id);

      // Set HTTP-only session cookie
      const { setResponseHeaders } = await import("@tanstack/react-start/server");
      setResponseHeaders({
        "Set-Cookie": cookieString,
      } as any);

      return {
        success: true,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          role: targetUser.role,
        },
      };
    } catch (error: any) {
      console.error("SERVER_LOGIN_ERROR:", error);
      throw error;
    }
  });

// Server function to log out and clear cookie
export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getRequestHeaders, setResponseHeaders } = await import("@tanstack/react-start/server");
  const headers = getRequestHeaders();
  const { destroySession } = await import("@/lib/auth.server");
  const cookieString = await destroySession(headers);

  setResponseHeaders({
    "Set-Cookie": cookieString,
  } as any);

  return { success: true };
});
