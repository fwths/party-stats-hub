const db = require("better-sqlite3")("sqlite.db");
const tables = [
  "spells",
  "classes",
  "subclasses",
  "class_features",
  "species",
  "backgrounds",
  "feats",
  "weapons",
  "armor",
  "magic_items",
  "monsters",
  "characters",
];
tables.forEach((t) => {
  try {
    console.log(t + ": " + db.prepare("SELECT count(*) as c FROM " + t).get().c);
  } catch (e) {}
});
