import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server function to verify authentication status
export const checkAuthFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const headers = getRequestHeaders();
    const { isAuthenticated } = await import("@/lib/auth.server");
    const authenticated = await isAuthenticated(headers);
    return { authenticated };
  });

// Server function to authenticate via passcode
export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ passcode: z.string() }))
  .handler(async ({ data }) => {
    const { verifyPasscode, startSession } = await import("@/lib/auth.server");
    const isValid = verifyPasscode(data.passcode);
    if (!isValid) {
      throw new Error("Invalid campaign passcode");
    }

    const { cookieString } = await startSession();

    // Set HTTP-only session cookie
    const { setResponseHeaders } = await import("@tanstack/react-start/server");
    setResponseHeaders({
      "Set-Cookie": cookieString,
    });

    return { success: true };
  });

// Server function to log out and clear cookie
export const logoutFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const { getRequestHeaders, setResponseHeaders } = await import("@tanstack/react-start/server");
    const headers = getRequestHeaders();
    const { destroySession } = await import("@/lib/auth.server");
    const cookieString = await destroySession(headers);

    setResponseHeaders({
      "Set-Cookie": cookieString,
    });

    return { success: true };
  });
