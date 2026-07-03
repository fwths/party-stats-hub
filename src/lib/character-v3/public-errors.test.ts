import { describe, expect, it } from "vitest";
import { characterV3PublicError, parseCharacterV3PublicError } from "./public-errors";

describe("Character V3 public error contract", () => {
  it("survives RPC-style message-only error serialization", () => {
    const serverError = characterV3PublicError(
      "REVISION_CONFLICT",
      "The character changed in another browser",
    );
    const clientError = new Error(serverError.message);
    expect(parseCharacterV3PublicError(clientError)).toEqual({
      code: "REVISION_CONFLICT",
      message: "The character changed in another browser",
    });
  });

  it("does not misclassify unrelated errors", () => {
    expect(parseCharacterV3PublicError(new Error("Network unavailable"))).toBeNull();
  });
});
