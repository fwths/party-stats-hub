import { getSpellsFromDb } from './src/lib/db-functions.ts';

async function test() {
  try {
    const res = await (getSpellsFromDb as any).__executeServer();
    console.log("Found:", res.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
