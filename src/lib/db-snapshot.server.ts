let snapshotCache: Record<string, any[]> | null = null;

export async function getSnapshot(): Promise<Record<string, any[]>> {
  if (snapshotCache) return snapshotCache;

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const snapshotPath = path.join(process.cwd(), "src", "data", "db-snapshot.json");
    const raw = await fs.readFile(snapshotPath, "utf-8");
    snapshotCache = JSON.parse(raw);
    return snapshotCache!;
  } catch {
    snapshotCache = {};
    return snapshotCache;
  }
}
