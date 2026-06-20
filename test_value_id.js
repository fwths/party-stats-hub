import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/cache/char-131296315.json', 'utf8'));

const nameOverrides = new Map();
data.data.characterValues.forEach(cv => {
  if (cv.typeId === 8) {
    nameOverrides.set(Number(cv.valueId), cv.value);
  }
});

function checkSpell(s) {
  if (nameOverrides.has(s.id)) {
    console.log(`Spell ${s.definition.name} (id ${s.id}) overridden to: ${nameOverrides.get(s.id)}`);
  }
}

const sources = ["race", "class", "background", "item", "feat"];
for (const source of sources) {
  const list = data.data.spells[source] || [];
  list.forEach(checkSpell);
}

const classSpells = data.data.classSpells || [];
classSpells.forEach(cs => {
  cs.spells.forEach(checkSpell);
});
