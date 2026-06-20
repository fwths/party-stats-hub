import { getSpellsFromDb } from './src/lib/db-functions.ts';

async function test() {
  try {
    const res = getSpellsFromDb;
    console.log("Type of getSpellsFromDb:", typeof res);
    console.log("Keys:", Object.keys(res));
  } catch (err) {
    console.error("Error querying db:", err);
  }
}
test();
