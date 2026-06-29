import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { verifyRestoreDrill } from "../src/db/backup.server";

if (!process.argv[2]) throw new Error("Usage: npm run db:restore:verify -- <backup-path>");
const backupPath = path.resolve(process.argv[2]);
const restoredPath = path.join(os.tmpdir(), `party-stats-restore-drill-${randomUUID()}.sqlite`);
const manifest = verifyRestoreDrill({ backupPath, restoredPath });
console.log(JSON.stringify({ backupPath, verified: true, manifest }, null, 2));
