const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
const row = db.prepare("SELECT * FROM characters WHERE name LIKE '%willow%'").get();
console.log(row ? row.name : 'Not found');
if (row && row.raw_json) {
  const data = JSON.parse(row.raw_json);
  console.log(JSON.stringify(data.classSpells, null, 2));
}
