import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/cache/char-131296315.json', 'utf8'));

console.log("characterValues:");
console.log(data.data.characterValues);
