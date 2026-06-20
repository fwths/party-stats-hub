import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = 'data/party-stats.db';
if (fs.existsSync(dbPath)) {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", tables.map(t => t.name));
  
  // Try to find characters
  if (tables.some(t => t.name === 'characters')) {
    const willow = db.prepare("SELECT * FROM characters WHERE name LIKE '%willow%' OR player_name LIKE '%willow%'").get();
    if (willow) {
      console.log("Found Willow in characters table!");
      console.log("Columns:", Object.keys(willow));
      if (willow.rawJson || willow.raw_json) {
         const raw = JSON.parse(willow.rawJson || willow.raw_json);
         const spells = raw.classSpells || raw.spells;
         fs.writeFileSync('willow_spells.json', JSON.stringify(spells, null, 2));
         console.log("Dumped spells to willow_spells.json");
      }
    } else {
      console.log("Willow not found in characters table.");
    }
  }
} else {
  console.log("No party-stats.db found.");
}
