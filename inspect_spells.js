import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/cache/char-131296315.json', 'utf8'));

console.log("=== SPELLS ===");
const sources = ["race", "class", "background", "item", "feat"];
for (const source of sources) {
  const list = data.data.spells[source] || [];
  list.forEach(s => {
    if (s.override || s.clientOverrides || s.displayAs) {
      console.log("Source:", source, "Spell:", s.definition?.name);
      console.log("Overrides:", s.override, s.clientOverrides, s.displayAs);
    }
  });
}

console.log("=== CLASS SPELLS ===");
const classSpells = data.data.classSpells || [];
classSpells.forEach(cs => {
  cs.spells.forEach(s => {
    if (s.override || s.clientOverrides || s.displayAs) {
      console.log("ClassSpell:", s.definition?.name);
      console.log("Overrides:", s.override, s.clientOverrides, s.displayAs);
    }
  });
});
