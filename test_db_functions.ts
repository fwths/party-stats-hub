import { getSpellsFromDb } from './src/lib/db-functions.ts';

async function test() {
  try {
    const rows = await getSpellsFromDb();
    console.log("Spells found via getSpellsFromDb:", rows.length);
  } catch (err) {
    console.error("Error querying db:", err);
  }
}
test();
