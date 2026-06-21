import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getShortName(fullName: string): string {
  if (!fullName) return "";
  const matchQuote = fullName.match(/["']([^"']+)["']/);
  if (matchQuote && matchQuote[1]) {
    return matchQuote[1].trim();
  }
  const nameWithoutYear = fullName.replace(/^\d+\s+/, "");
  const firstWord = nameWithoutYear.split(/\s+/)[0];
  const shortName = firstWord || fullName;
  if (shortName === "Qemuel") return "Qem";
  return shortName;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return (
    html
      // Remove script tags and their contents
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      // Remove inline event handlers (e.g. onload, onclick, onerror)
      .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "")
      // Remove javascript: pseudo-protocol in links/hrefs
      .replace(/href\s*=\s*(["']javascript:[^"']*["']|javascript:[^\s>]+)/gi, "")
      // Remove iframe/object/embed/link/style/meta tags that could run exploits or load resources
      .replace(/<(iframe|object|embed|link|meta|style)[^>]*>([\s\S]*?)<\/\1>/gi, "")
      .replace(/<(iframe|object|embed|link|meta|style)[^>]*\/>/gi, "")
  );
}
