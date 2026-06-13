import fs from "node:fs/promises";
import path from "node:path";

const ENDPOINTS = [
  "spells",
  "monsters",
  "magicitems",
];

async function fetchAll(endpoint: string) {
  let results: any[] = [];
  let url = `https://api.open5e.com/v1/${endpoint}/?limit=100`;
  
  while (url) {
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    results = results.concat(data.results);
    url = data.next;
  }
  return results;
}

async function main() {
  const publicDir = path.join(process.cwd(), "public", "data", "srd");
  await fs.mkdir(publicDir, { recursive: true });

  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Downloading all ${endpoint}...`);
      const data = await fetchAll(endpoint);
      const filePath = path.join(publicDir, `${endpoint}.json`);
      const fileData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, fileData, "utf-8");
      console.log(`Saved ${endpoint}.json (${(fileData.length / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.error(`Error downloading ${endpoint}:`, e);
    }
  }
}

main().catch(console.error);
