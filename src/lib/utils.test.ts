import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./utils";

describe("sanitizeHtml", () => {
  it("should return empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null as any)).toBe("");
    expect(sanitizeHtml(undefined as any)).toBe("");
  });

  it("should keep safe HTML tags intact", () => {
    const input = "<div>Hello <strong>World</strong>! <p>This is safe.</p></div>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should remove script tags and their content", () => {
    const input = "<div>Before <script>alert('hack');</script> After</div>";
    expect(sanitizeHtml(input)).toBe("<div>Before  After</div>");
  });

  it("should remove inline event handlers", () => {
    const input =
      '<img src="x" onerror="alert(1)" onclick=\'console.log("hi")\' onload=doSomething() />';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onload");
    expect(sanitized).toBe('<img src="x" />');
  });

  it("should remove javascript: links", () => {
    const input =
      "<a href=\"javascript:alert(1)\">Click here</a> or <a href='javascript:evil()'>there</a>";
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toBe("<a >Click here</a> or <a >there</a>");
  });

  it("should remove unsafe tags like iframe, object, embed, style, link, meta", () => {
    const input =
      '<div><iframe src="evil.com"></iframe><object>data</object><embed src="x"/><link rel="stylesheet" href="x"/><style>body{}</style><meta name="x"/></div>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).toBe("<div></div>");
  });
});
