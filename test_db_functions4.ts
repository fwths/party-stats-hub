import { getSpellsFromDb } from './src/lib/db-functions.ts';
async function test() {
  try {
    const fn = (getSpellsFromDb as any).__executeServer;
    if (fn) {
        const AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;
        const storage = require('@tanstack/start-storage-context').getStartContext();
        // Mock start context
        storage.run({}, async () => {
             const res = await fn();
             console.log("Got:", res.length);
        });
    } else {
        const res = await getSpellsFromDb();
        console.log("Got:", res.length);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
