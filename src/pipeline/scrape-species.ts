import * as cheerio from "cheerio";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function scrapeSpecies() {
  console.log("Fetching species index...");
  const indexRes = await fetch("https://www.dndbeyond.com/species");
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch index: ${indexRes.status}`);
  }
  const indexHtml = await indexRes.text();
  const $ = cheerio.load(indexHtml);

  const speciesList: { name: string; url: string; description: string; source: string }[] = [];

  $(".listing-card").each((_, el) => {
    const searchData = $(el).attr("data-collapsible-search") || "";
    const source = searchData.split("|")[1] || "Unknown Source";

    const $link = $(el).find("a.listing-card__link");
    const href = $link.attr("href");
    if (!href || !href.startsWith("/species/")) return;

    let name = $link.text().trim();
    name = name.split("\n")[0].trim();

    const description = $(el).find("p").first().text().trim();

    speciesList.push({ name, url: `https://www.dndbeyond.com${href}`, description, source });
  });

  console.log(`Found ${speciesList.length} species. Starting extraction...`);

  let count = 0;
  for (const s of speciesList) {
    try {
      console.log(`Fetching ${s.name} (${s.url})...`);
      const res = await fetch(s.url);
      if (!res.ok) {
        console.warn(`Skipping ${s.name}: ${res.status}`);
        continue;
      }
      const html = await res.text();
      const $page = cheerio.load(html);

      const features: { name: string; description: string; html: string }[] = [];
      let currentSpeed = 30;
      let currentSize = "Medium";
      let abilityScoreIncreases: Record<string, number> = {};
      let senses: Record<string, number> = {};
      let languages: string[] = [];

      $page("h4").each((_, h4) => {
        const traitName = $(h4).text().trim();
        let traitDesc = "";
        let traitHtml = "";
        let nextEl = $(h4).next();
        while (nextEl.length && !nextEl.is("h1, h2, h3, h4, h5")) {
          traitDesc += nextEl.text().trim() + "\n";
          traitHtml += $page.html(nextEl) + "\n";
          nextEl = nextEl.next();
        }
        traitDesc = traitDesc.trim();
        traitHtml = traitHtml.trim();

        if (traitName && traitDesc) {
          features.push({ name: traitName, description: traitDesc, html: traitHtml });

          const lowerDesc = traitDesc.toLowerCase();

          if (traitName.toLowerCase().includes("speed")) {
            const match = lowerDesc.match(/(\d+)\s+feet/);
            if (match) currentSpeed = parseInt(match[1]);
          }
          if (traitName.toLowerCase().includes("size")) {
            if (lowerDesc.includes("small")) currentSize = "Small";
          }

          if (traitName.toLowerCase().includes("ability score increase")) {
            const abilities = [
              "strength",
              "dexterity",
              "constitution",
              "intelligence",
              "wisdom",
              "charisma",
            ];
            for (const ab of abilities) {
              const regex = new RegExp(`your ${ab} score increases by (\\d+)`, "i");
              const match = lowerDesc.match(regex);
              if (match) abilityScoreIncreases[ab] = parseInt(match[1]);
            }
            if (lowerDesc.includes("increases by 2") && lowerDesc.includes("increases by 1")) {
              abilityScoreIncreases["any"] = 2;
              abilityScoreIncreases["other"] = 1;
            }
          }

          if (traitName.toLowerCase().includes("darkvision")) {
            const match = lowerDesc.match(/(\d+)\s+feet/);
            if (match) senses["Darkvision"] = parseInt(match[1]);
          }

          if (traitName.toLowerCase().includes("languages")) {
            const match = lowerDesc.match(/speak, read, and write (.*?)(?:$|\.)/i);
            if (match) {
              languages.push(match[1].trim());
            }
          }
        }
      });

      const id = slugify(s.name);

      await db
        .insert(schema.species)
        .values({
          id,
          name: s.name,
          description: s.description,
          featuresJson: JSON.stringify(features),
          size: currentSize,
          speed: currentSpeed,
          source: s.source,
          abilityScoreIncreasesJson:
            Object.keys(abilityScoreIncreases).length > 0
              ? JSON.stringify(abilityScoreIncreases)
              : null,
          sensesJson: Object.keys(senses).length > 0 ? JSON.stringify(senses) : null,
          languagesJson: languages.length > 0 ? JSON.stringify(languages) : null,
        })
        .onConflictDoUpdate({
          target: schema.species.id,
          set: {
            name: s.name,
            description: s.description,
            featuresJson: JSON.stringify(features),
            size: currentSize,
            speed: currentSpeed,
            source: s.source,
            abilityScoreIncreasesJson:
              Object.keys(abilityScoreIncreases).length > 0
                ? JSON.stringify(abilityScoreIncreases)
                : null,
            sensesJson: Object.keys(senses).length > 0 ? JSON.stringify(senses) : null,
            languagesJson: languages.length > 0 ? JSON.stringify(languages) : null,
          },
        });

      count++;
      await delay(1000);
    } catch (err: any) {
      console.error(`Error scraping ${s.name}: ${err.message}`);
    }
  }

  console.log(`Successfully scraped and upserted ${count} species.`);
}

scrapeSpecies()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
