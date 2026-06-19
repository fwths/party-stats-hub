// Notion API Utilities and database/column sorting helpers

const PREFERRED_COLUMN_ORDERS: Record<string, string[]> = {
  npc: [
    "Tags",
    "Species",
    "Location",
    "Affiliation",
    "Occupation/Role",
    "Relationship",
    "Status",
    "Session",
  ],
  organization: ["Relation", "Region", "Type", "Alignment", "Leader(s)", "Status"],
  location: ["Category", "Parent Location", "Status", "Notes/History"],
  deit: ["Type", "Alignment / Nature", "Plane / Origin", "Associated Groups"],
  item: ["Type", "Owned/Used By", "Associated Organization", "Rarity / Power Level"],
  "mother of bob": [
    "Species",
    "Class(es)",
    "Subclass(es)",
    "Status",
    "Notable Allies/Relationships",
    "Organization/Group",
  ],
  mob: [
    "Species",
    "Class(es)",
    "Subclass(es)",
    "Status",
    "Notable Allies/Relationships",
    "Organization/Group",
  ],
};

export function sortColumnKeys(columnKeys: string[], dbTitle: string): string[] {
  const titleLower = dbTitle.toLowerCase();
  const matchKey = Object.keys(PREFERRED_COLUMN_ORDERS).find((key) => titleLower.includes(key));

  if (!matchKey) return columnKeys;

  const preferredOrder = PREFERRED_COLUMN_ORDERS[matchKey];

  return [...columnKeys].sort((a, b) => {
    const idxA = preferredOrder.findIndex((col) => col.toLowerCase() === a.toLowerCase());
    const idxB = preferredOrder.findIndex((col) => col.toLowerCase() === b.toLowerCase());

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function getPropertyValueText(prop: any): string {
  if (!prop) return "";

  // Failsafe fallback for simple strings or numbers
  if (typeof prop === "string") return prop;
  if (typeof prop === "number") return String(prop);
  if (typeof prop === "boolean") return prop ? "Yes" : "No";

  if (Array.isArray(prop)) {
    return prop
      .map((item) => getPropertyValueText(item))
      .filter(Boolean)
      .join(", ");
  }

  const type = prop.type;
  if (!type) {
    if (prop.plain_text !== undefined) return prop.plain_text;
    if (prop.name !== undefined) return prop.name;
    if (prop.string !== undefined) return prop.string;
    if (prop.number !== undefined) return String(prop.number);
    const values = Object.values(prop);
    if (values.length === 1) return getPropertyValueText(values[0]);
    return "";
  }

  const val = prop[type];
  if (val === undefined || val === null) return "";

  switch (type) {
    case "title":
    case "rich_text":
      // Check if it has page mentions. If so, format them as markdown links and join them with commas
      const hasMentions = (val || []).some(
        (t: any) => t.type === "mention" && t.mention?.type === "page",
      );
      if (hasMentions) {
        return (val || [])
          .map((t: any) => {
            if (t.type === "mention" && t.mention?.type === "page" && t.mention.page?.id) {
              return `[${t.plain_text || "Page"}](pageId:${t.mention.page.id})`;
            }
            const trimmed = (t.plain_text || "").trim();
            if (trimmed === "" || trimmed === ",") return "";
            return trimmed;
          })
          .filter(Boolean)
          .join(", ");
      }
      return (val || []).map((t: any) => t.plain_text || "").join("");
    case "select":
      return val?.name || "";
    case "multi_select":
      return (val || []).map((s: any) => s.name || "").join(", ");
    case "status":
      return val?.name || "";
    case "date":
      return val?.start || "";
    case "number":
      return String(val);
    case "checkbox":
      return val ? "Yes" : "No";
    case "url":
      return val || "";
    case "email":
      return val || "";
    case "phone_number":
      return val || "";
    case "people":
      return (val || []).map((p: any) => p.name || "").join(", ");
    case "relation":
      // Map relation objects. If they contain titles/names, format them, otherwise return empty so they are filtered out
      return (val || [])
        .map((r: any) => {
          if (r.title && Array.isArray(r.title)) {
            return r.title.map((t: any) => t.plain_text || "").join("");
          }
          if (r.plain_text) return r.plain_text;
          return getPropertyValueText(r); // Try to resolve relation fields recursively
        })
        .filter(Boolean)
        .join(", ");
    case "rollup":
      // Rollups can be arrays, strings, numbers, or dates. Format them dynamically.
      if (val && val.type === "array" && Array.isArray(val.array)) {
        return val.array
          .map((item: any) => getPropertyValueText(item))
          .filter(Boolean)
          .join(", ");
      }
      if (val && val.type === "number") return String(val.number);
      if (val && val.type === "string") return val.string || "";
      if (val && val.type === "date") return val.date?.start || "";
      return getPropertyValueText(val); // Fallback to parsing the rollup value object recursively
    default:
      return "";
  }
}

// Dynamically sort database entries depending on properties and title context (matching Notion's UI sorting logic)
export function sortDatabaseResults(results: any[], databaseTitle: string): any[] {
  if (!results || results.length <= 1) return results;

  const firstEntry = results[0];
  const properties = firstEntry.properties || {};
  const titleLower = databaseTitle.toLowerCase();

  // NPC Database Exception: Sort by Session property
  if (titleLower.includes("npc")) {
    const sessionKey = Object.keys(properties).find((key) => {
      const name = key.toLowerCase();
      return name === "session" || name.includes("session");
    });

    if (sessionKey) {
      const getSessionVal = (prop: any) => {
        if (!prop) return "";
        const t = prop.type;
        const val = prop[t];
        if (val === undefined || val === null) return "";

        if (t === "number") return val;
        if (t === "select") return val.name || "";
        if (t === "rich_text" || t === "title") {
          return (val || []).map((x: any) => x.plain_text || "").join("");
        }
        if (t === "date") return val.start || "";
        return getPropertyValueText(prop);
      };

      return [...results].sort((a, b) => {
        const valA = getSessionVal(a.properties?.[sessionKey]);
        const valB = getSessionVal(b.properties?.[sessionKey]);

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
          return numA - numB;
        }

        return String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    }

    // Fallback for NPCs: sort by creation time (ascending)
    return [...results].sort((a, b) => {
      const dateA = new Date(a.created_time).getTime();
      const dateB = new Date(b.created_time).getTime();
      return dateA - dateB;
    });
  }

  // General default: sort every database alphabetically by its title/name column
  const titleKey = Object.keys(properties).find((key) => properties[key].type === "title");

  if (titleKey) {
    return [...results].sort((a, b) => {
      const propA = a.properties?.[titleKey];
      const propB = b.properties?.[titleKey];
      const textA = (propA?.title || [])
        .map((t: any) => t.plain_text || "")
        .join("")
        .toLowerCase();
      const textB = (propB?.title || [])
        .map((t: any) => t.plain_text || "")
        .join("")
        .toLowerCase();
      return textA.localeCompare(textB);
    });
  }

  return results;
}

export async function resolveBlockChildrenRecursive(token: string, blocks: any[]): Promise<any[]> {
  const resolved: any[] = [];
  const containerTypes = ["column_list", "column", "toggle", "synced_block"];

  for (const block of blocks) {
    if (block.type === "child_database") {
      try {
        const dbResponse = await fetch(`https://api.notion.com/v1/databases/${block.id}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100 }),
        });
        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          const dbTitle = block.child_database.title || "Database";
          const sortedResults = sortDatabaseResults(dbData.results || [], dbTitle);
          resolved.push({
            object: "block",
            type: "database_table",
            database_table: {
              title: dbTitle,
              results: sortedResults,
            },
          });
          continue;
        }
      } catch (e) {
        console.warn("Failed to fetch inline database block query:", block.id, e);
      }
    }

    resolved.push(block);

    if (block.has_children && containerTypes.includes(block.type)) {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
        });
        if (response.ok) {
          const data = await response.json();
          const children = data.results || [];
          const resolvedChildren = await resolveBlockChildrenRecursive(token, children);
          resolved.push(...resolvedChildren);
        }
      } catch (e) {
        console.warn("Failed to resolve sub-blocks of block ID:", block.id, e);
      }
    }
  }

  return resolved;
}
