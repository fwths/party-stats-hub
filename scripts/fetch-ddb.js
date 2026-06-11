const fs = require("fs");
const ids = [97349530, 131296315, 131593533, 132900149, 132940690];
(async () => {
  for (const id of ids) {
    const res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`);
    const json = await res.json();
    fs.writeFileSync(`char-${id}.json`, JSON.stringify(json, null, 2));
    console.log(`Saved ${id}: ${json.data?.name}`);
  }
})();
