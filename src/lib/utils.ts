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
