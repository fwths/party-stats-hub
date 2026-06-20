import { db } from './src/lib/drizzle.server.ts';
import * as schema from './src/db/schema.ts';

async function test() {
  try {
    const rows = await db.select().from(schema.spells).limit(5);
    console.log("Spells found:", rows.length);
  } catch (err) {
    console.error("Error querying db:", err);
  }
}
test();
