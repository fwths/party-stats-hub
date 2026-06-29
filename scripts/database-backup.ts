import path from "node:path";
import { createVerifiedBackup } from "../src/db/backup.server";

const sourcePath = path.resolve(process.argv[2] || process.env.DATABASE_URL || "sqlite.db");
const stamp = new Date().toISOString().replaceAll(":", "-");
const destinationPath = path.resolve(
  process.argv[3] || path.join("backups", `party-stats-${stamp}.sqlite`),
);
const manifest = await createVerifiedBackup({ sourcePath, destinationPath });
console.log(JSON.stringify({ sourcePath, destinationPath, manifest }, null, 2));

