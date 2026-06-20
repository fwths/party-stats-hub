import { getSnapshot } from './src/lib/db-snapshot.server.ts';

async function test() {
  try {
    const res = await getSnapshot();
    console.log("Snapshot keys:", Object.keys(res));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
