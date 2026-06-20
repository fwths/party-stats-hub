import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/cache/char-131296315.json', 'utf8'));

function searchForWillow(obj, path = '') {
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('willow') && obj !== 'Willow Alatériel' && obj !== 'Haunted Willow' && !obj.includes('Flux of Sorcery')) {
      console.log(`Found at ${path}: ${obj}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => searchForWillow(item, `${path}[${i}]`));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      searchForWillow(obj[key], `${path}.${key}`);
    }
  }
}

searchForWillow(data);
