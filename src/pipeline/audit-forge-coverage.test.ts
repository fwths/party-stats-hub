import { describe, expect, it } from "vitest";
import { auditForgeCoverage } from "./audit-forge-coverage";

describe("auditForgeCoverage", () => {
  it("keeps every non-excluded Forge table complete", () => {
    const incomplete = auditForgeCoverage().filter(
      (result) => result.status === "missing" || result.status === "partial",
    );

    expect(incomplete).toEqual([]);
  });
});
