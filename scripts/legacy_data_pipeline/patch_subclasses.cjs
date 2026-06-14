const fs = require("fs");

let classes = fs.readFileSync("src/data/srd/classes.ts", "utf8");

function injectFields(id, levelChosen, description) {
  const marker = `"id": "${id}",\n        "name":`;
  const replaceWith = `"id": "${id}",\n        "name":`;

  // Actually wait, let's just insert them before "featuresByLevel"
  const target = `"id": "${id}",`;
  const startIdx = classes.indexOf(target);
  if (startIdx !== -1) {
    const insertIdx = classes.indexOf('"featuresByLevel"', startIdx);
    if (insertIdx !== -1) {
      const newFields = `"description": "${description}",\n        "levelChosen": ${levelChosen},\n        `;
      classes = classes.slice(0, insertIdx) + newFields + classes.slice(insertIdx);
      console.log(`Injected fields for ${id}`);
    }
  }
}

injectFields(
  "path-of-the-ancestral-guardian",
  3,
  "Some barbarians hail from cultures that revere their ancestors. These tribes teach that the warriors of the past linger in the world as mighty spirits, who can guide and protect the living.",
);
injectFields(
  "path-of-the-storm-herald",
  3,
  "All barbarians harbor a fury within. Their rage grants them superior strength, durability, and speed. Barbarians who follow the Path of the Storm Herald learn to transform that rage into a mantle of primal magic, which swirls around them.",
);
injectFields(
  "college-of-swords",
  3,
  "Bards of the College of Swords are called blades, and they entertain through daring feats of weapon prowess.",
);
injectFields(
  "college-of-whispers",
  3,
  "Most bards are happy to entertain audiences and perform acts of heroism. Bards of the College of Whispers use their knowledge and magic to uncover secrets and turn them against others through extortion and threats.",
);

fs.writeFileSync("src/data/srd/classes.ts", classes);
