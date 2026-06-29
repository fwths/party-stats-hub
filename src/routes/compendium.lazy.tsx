import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, User, Swords, ScrollText, Sparkles, Ghost, Wand2, Search } from "lucide-react";
import { getAllRules } from "@/lib/srd-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/utils";
import { ThemeSelector } from "@/components/party/ThemeSelector";
import { formatPrimaryAbility } from "@/components/builder/BuilderUtils";

import { useQuery } from "@tanstack/react-query";
import {
  getContentSourcesFromDb,
  getSpellsFromDb,
  getMonstersFromDb,
  getMagicItemsFromDb,
  getCompendiumSearchMetaFromDb,
  searchCompendiumEntriesFromDb,
} from "@/lib/db-functions";

export const Route = createLazyFileRoute("/compendium")({
  component: CompendiumComponent,
});

type TabType = "rules" | "races" | "classes" | "spells" | "monsters" | "items" | "all";

function parseRawJson(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripTags(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\{@(\w+)\s+([^}]+)\}/g, (_match, tag: string, body: string) => {
      const [label, , displayText] = body.split("|");
      if (tag === "dice" || tag === "damage" || tag === "scaledamage") return label;
      if (tag === "hit" || tag === "dc") return label.startsWith("+") ? label : `DC ${label}`;
      if (tag === "h") return "";
      if (tag === "atkr") return label;
      return displayText || label;
    })
    .replace(/\{@actSave (\w+)\}/g, (_match, ability: string) => `${ability.toUpperCase()} Save:`)
    .replace(/\{@actSaveFail\}/g, "Failure:")
    .replace(/\{@actSaveSuccess\}/g, "Success:")
    .replace(/\{@i ([^}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveFluffImage(pathStr: string): string {
  if (!pathStr) return "";
  if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) {
    return pathStr;
  }
  return `https://5e.tools/img/${pathStr}`;
}

function EntryRenderer({
  entry,
  depth = 0,
}: {
  entry: any;
  depth?: number;
}): React.JSX.Element | null {
  if (!entry) return null;

  if (typeof entry === "string") {
    return <p className="text-foreground/90 leading-relaxed mb-4">{stripTags(entry)}</p>;
  }

  if (Array.isArray(entry)) {
    return (
      <>
        {entry.map((sub, i) => (
          <EntryRenderer key={i} entry={sub} depth={depth} />
        ))}
      </>
    );
  }

  const type = entry.type || "entries";

  switch (type) {
    case "section":
    case "entries": {
      const HeadingTag = depth === 0 ? "h2" : depth === 1 ? "h3" : "h4";
      const headingClass =
        depth === 0
          ? "text-2xl font-bold mt-6 mb-3 border-b border-border/40 pb-1 text-primary"
          : depth === 1
            ? "text-xl font-bold mt-4 mb-2 text-foreground"
            : "text-lg font-semibold mt-3 mb-1 text-muted-foreground";

      return (
        <div className="mb-6">
          {entry.name && <HeadingTag className={headingClass}>{stripTags(entry.name)}</HeadingTag>}
          {entry.entries && <EntryRenderer entry={entry.entries} depth={depth + 1} />}
        </div>
      );
    }
    case "list": {
      return (
        <ul className="list-disc pl-5 space-y-1 mb-4 text-foreground/95">
          {entry.items?.map((item: any, i: number) => (
            <li key={i}>
              <EntryRenderer entry={item} depth={depth} />
            </li>
          ))}
        </ul>
      );
    }
    case "table": {
      return (
        <div className="overflow-x-auto my-4 rounded-lg border border-border/40 bg-secondary/15">
          <table className="w-full text-sm border-collapse text-left">
            {entry.caption && (
              <caption className="p-3 text-xs font-semibold text-muted-foreground text-center bg-secondary/20">
                {stripTags(entry.caption)}
              </caption>
            )}
            {entry.colHeaders && (
              <thead>
                <tr className="bg-secondary/35 border-b border-border/40">
                  {entry.colHeaders.map((header: string, i: number) => (
                    <th key={i} className="p-3 font-semibold text-foreground">
                      {stripTags(header)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {entry.rows?.map((row: any[], rIdx: number) => (
                <tr
                  key={rIdx}
                  className="border-b border-border/20 last:border-0 hover:bg-secondary/10"
                >
                  {row.map((cell: any, cIdx: number) => (
                    <td key={cIdx} className="p-3 text-foreground/80">
                      <EntryRenderer entry={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "image": {
      const pathStr = entry.href?.path || entry.path;
      if (!pathStr) return null;
      const imageUrl = resolveFluffImage(pathStr);
      return (
        <div className="my-6 flex flex-col items-center gap-2">
          <img
            src={imageUrl}
            alt={entry.title || "Illustration"}
            className="rounded-xl max-w-full md:max-w-xl h-auto shadow-lg border border-border/40 object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          {entry.title && (
            <span className="text-xs text-muted-foreground italic">{stripTags(entry.title)}</span>
          )}
        </div>
      );
    }
    default:
      if (entry.entries) {
        return <EntryRenderer entry={entry.entries} depth={depth} />;
      }
      if (entry.entry) {
        return <EntryRenderer entry={entry.entry} depth={depth} />;
      }
      return null;
  }
}

function rawEntrySummary(entry: any) {
  const raw = parseRawJson(entry.rawJson);
  if (!raw) return entry.searchText || "";
  const chunks = [raw.description, raw.desc, raw.text, raw.entries, raw.entry]
    .flat()
    .filter(Boolean);
  if (!chunks.length) return entry.searchText || "";
  return chunks
    .map((chunk) => (typeof chunk === "string" ? chunk : JSON.stringify(chunk)))
    .join("\n\n")
    .slice(0, 4000);
}

function CompendiumComponent() {
  const { dbClasses, dbSpecies } = Route.useLoaderData();
  const rules = getAllRules();

  const [activeTab, setActiveTab] = useState<TabType>("rules");
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(
    rules[0]?.id || null,
  );
  const [search, setSearch] = useState("");
  const [rawEntityType, setRawEntityType] = useState("");
  const [rawSource, setRawSource] = useState("");
  const [mobileShowDetails, setMobileShowDetails] = useState(false);

  const { data: spells = [], isLoading: loadingSpells } = useQuery({
    queryKey: ["db-spells"],
    queryFn: () => getSpellsFromDb(),
    enabled: activeTab === "spells",
  });

  const { data: monsters = [], isLoading: loadingMonsters } = useQuery({
    queryKey: ["db-monsters"],
    queryFn: () => getMonstersFromDb(),
    enabled: activeTab === "monsters",
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["db-items"],
    queryFn: () => getMagicItemsFromDb(),
    enabled: activeTab === "items",
  });

  const { data: contentSources = [] } = useQuery({
    queryKey: ["content-sources"],
    queryFn: () => getContentSourcesFromDb(),
    enabled: activeTab === "all",
  });

  const { data: rawSearchMeta = { entityTypes: [], sources: [] } } = useQuery({
    queryKey: ["raw-compendium-meta"],
    queryFn: () => getCompendiumSearchMetaFromDb(),
    enabled: activeTab === "all",
  });

  const isAllSearchActive = !!(search.trim() || rawEntityType || rawSource);

  const { data: rawEntries = [], isLoading: loadingRawEntries } = useQuery({
    queryKey: ["raw-compendium", search, rawEntityType, rawSource],
    queryFn: () =>
      searchCompendiumEntriesFromDb({
        data: {
          query: search,
          entityType: rawEntityType || undefined,
          source: rawSource || undefined,
          limit: 300,
        },
      } as any),
    enabled: activeTab === "all" && isAllSearchActive,
  });

  const sourceNames = new Map(contentSources.map((source: any) => [source.code, source.name]));

  const isLoading =
    (activeTab === "spells" && loadingSpells) ||
    (activeTab === "monsters" && loadingMonsters) ||
    (activeTab === "items" && loadingItems) ||
    (activeTab === "all" && loadingRawEntries);

  const getActiveData = () => {
    switch (activeTab) {
      case "rules":
        return rules;
      case "races":
        return dbSpecies;
      case "classes":
        return dbClasses;
      case "spells":
        return spells;
      case "monsters":
        return monsters;
      case "items":
        return items;
      case "all":
        return rawEntries;
    }
  };

  const activeData = getActiveData();

  const filteredData = activeData.filter((item: any) => {
    if (!search) return true;
    const name = item.title || item.name || "";
    if (activeTab === "all") return true;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedItem =
    activeData.find((item: any) => (item.id || item.slug) === selectedItemId) || filteredData[0];

  const fluff = selectedItem ? parseRawJson(selectedItem.fluffJson) : null;
  const firstFluffImage = fluff?.images?.[0]?.href?.path || fluff?.images?.[0]?.path || null;

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 border-b border-border/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link to="/" className="self-start">
            <Button variant="outline" size="sm" className="backdrop-blur-sm bg-background/50">
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2 bg-gradient-to-r from-blue-400 via-primary to-purple-500 bg-clip-text text-transparent">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            The Grand Library
          </h1>
        </div>
        <div className="self-start sm:self-auto">
          <ThemeSelector />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          className={`md:col-span-1 h-[calc(100vh-12rem)] bg-card/60 backdrop-blur-md border-border/40 shadow-xl overflow-hidden ring-1 ring-white/5 ${mobileShowDetails ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
        >
          <CardHeader className="pb-4 bg-secondary/20 border-b border-border/40">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                variant={activeTab === "rules" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("rules");
                  setSearch("");
                  setSelectedItemId(rules[0]?.id);
                  setMobileShowDetails(false);
                }}
              >
                <ScrollText className="h-4 w-4 mr-2" /> Rules
              </Button>
              <Button
                variant={activeTab === "classes" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("classes");
                  setSearch("");
                  setSelectedItemId(dbClasses[0]?.id ?? null);
                  setMobileShowDetails(false);
                }}
              >
                <Swords className="h-4 w-4 mr-2" /> Classes
              </Button>
              <Button
                variant={activeTab === "races" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("races");
                  setSearch("");
                  setSelectedItemId(dbSpecies[0]?.id);
                  setMobileShowDetails(false);
                }}
              >
                <User className="h-4 w-4 mr-2" /> Species
              </Button>
              <Button
                variant={activeTab === "spells" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("spells");
                  setSearch("");
                  setSelectedItemId(null);
                  setMobileShowDetails(false);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Spells
              </Button>
              <Button
                variant={activeTab === "monsters" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("monsters");
                  setSearch("");
                  setSelectedItemId(null);
                  setMobileShowDetails(false);
                }}
              >
                <Ghost className="h-4 w-4 mr-2" /> Monsters
              </Button>
              <Button
                variant={activeTab === "items" ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("items");
                  setSearch("");
                  setSelectedItemId(null);
                  setMobileShowDetails(false);
                }}
              >
                <Wand2 className="h-4 w-4 mr-2" /> Items
              </Button>
              <Button
                variant={activeTab === "all" ? "default" : "secondary"}
                size="sm"
                className="col-span-2"
                onClick={() => {
                  setActiveTab("all");
                  setSearch("");
                  setSelectedItemId(null);
                  setMobileShowDetails(false);
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" /> All Data
              </Button>
            </div>

            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${filteredData.length} entries...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background/50 border border-border/50 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {activeTab === "all" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <select
                  value={rawEntityType}
                  onChange={(event) => {
                    setRawEntityType(event.target.value);
                    setSelectedItemId(null);
                  }}
                  className="w-full px-2 py-2 bg-background/50 border border-border/50 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All types</option>
                  {rawSearchMeta.entityTypes.map((type: any) => (
                    <option key={type.entityType} value={type.entityType}>
                      {type.entityType} ({type.count})
                    </option>
                  ))}
                </select>
                <select
                  value={rawSource}
                  onChange={(event) => {
                    setRawSource(event.target.value);
                    setSelectedItemId(null);
                  }}
                  className="w-full px-2 py-2 bg-background/50 border border-border/50 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All books</option>
                  {rawSearchMeta.sources.map((source: any) => (
                    <option key={source.source} value={source.source}>
                      {sourceNames.get(source.source) || source.source} ({source.count})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-2">
            {activeTab === "all" && !isAllSearchActive ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground gap-3 animate-fade-in select-none">
                <Search className="h-10 w-10 opacity-40 text-primary" />
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-foreground">Search the Compendium</p>
                  <p className="text-[11px] leading-relaxed max-w-[200px] mx-auto text-muted-foreground/75">
                    Type a query or select a category filter above to browse books, adventures,
                    rules, and optional features.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse gap-2">
                <BookOpen className="h-8 w-8 opacity-50" />
                <span>Consulting ancient tomes...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                No entries found matching "{search}".
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredData.map((item: any) => {
                  const itemId = item.id || item.slug;
                  const isActive = selectedItemId === itemId;
                  return (
                    <button
                      key={itemId}
                      onClick={() => {
                        setSelectedItemId(itemId);
                        setMobileShowDetails(true);
                      }}
                      className={`text-left px-3 py-2 rounded-md transition-all duration-200 text-sm truncate ${
                        isActive
                          ? "bg-primary/20 text-primary font-bold shadow-sm ring-1 ring-primary/30"
                          : "hover:bg-muted/80 text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      {item.title || item.name}
                      {activeTab === "all" && (
                        <span className="block text-[11px] font-normal text-muted-foreground truncate">
                          {item.entityType} - {item.source}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`md:col-span-3 h-[calc(100vh-12rem)] overflow-y-auto bg-card/60 backdrop-blur-md border-border/40 shadow-xl ring-1 ring-white/5 ${mobileShowDetails ? "flex flex-col animate-in fade-in slide-in-from-right-4 duration-300" : "hidden md:block"}`}
        >
          {mobileShowDetails && (
            <div className="p-4 border-b border-border/20 md:hidden bg-secondary/15 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileShowDetails(false)}
                className="text-primary hover:text-primary/80 font-bold"
              >
                ← Back to List
              </Button>
            </div>
          )}
          {selectedItem ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {firstFluffImage && (
                <div className="w-full max-h-80 overflow-hidden flex items-center justify-center border-b border-border/20 bg-black/10 p-4">
                  <img
                    src={resolveFluffImage(firstFluffImage)}
                    alt={selectedItem.title || selectedItem.name}
                    className="max-h-72 w-auto rounded-lg shadow-md object-contain border border-border/30"
                    onError={(e) => {
                      (e.target as HTMLElement).parentElement!.style.display = "none";
                    }}
                  />
                </div>
              )}
              <CardHeader className="border-b border-border/20 bg-secondary/5 pb-6">
                <CardTitle className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                  {selectedItem.title || selectedItem.name}
                </CardTitle>

                {/* Spells Subtitle */}
                {selectedItem.level !== undefined && selectedItem.school && (
                  <CardDescription className="text-lg font-medium text-primary mt-2">
                    {selectedItem.level === "Cantrip" ? "Cantrip" : `Level ${selectedItem.level}`}{" "}
                    {selectedItem.school}
                  </CardDescription>
                )}

                {/* Monster Subtitle */}
                {selectedItem.size && selectedItem.type && selectedItem.alignment && (
                  <CardDescription className="text-lg font-medium text-amber-500 mt-2 capitalize">
                    {selectedItem.size} {selectedItem.type}, {selectedItem.alignment}
                  </CardDescription>
                )}

                {/* Standard Description */}
                {selectedItem.description && typeof selectedItem.description === "string" && 
                 (activeTab === "rules" || activeTab === "classes" || activeTab === "races") && (
                  <CardDescription className="text-lg mt-2 text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {selectedItem.description}
                  </CardDescription>
                )}
                {activeTab === "all" && (
                  <CardDescription className="text-sm font-medium text-muted-foreground mt-2">
                    {selectedItem.entityType} - {selectedItem.source}
                    {selectedItem.page ? ` - p. ${selectedItem.page}` : ""}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-foreground mt-6">
                {/* Rules Content */}
                {selectedItem.content && (
                  <div className="whitespace-pre-wrap text-foreground/90">
                    {selectedItem.content}
                  </div>
                )}

                {activeTab === "all" && (
                  <div className="space-y-4">
                    <div className="whitespace-pre-wrap text-foreground/90">
                      {rawEntrySummary(selectedItem)}
                    </div>
                    <details className="rounded-lg border border-border/40 bg-secondary/10 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-primary">
                        Raw 5etools JSON
                      </summary>
                      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-foreground/80">
                        {JSON.stringify(parseRawJson(selectedItem.rawJson), null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Species Badges */}
                {activeTab === "races" && (
                  <div className="flex flex-wrap gap-3 mb-6 mt-4">
                    {selectedItem.abilityScoreIncreasesJson && (
                      <span className="text-sm font-bold bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-md shadow-sm">
                        ASI:{" "}
                        {Object.entries(parseRawJson(selectedItem.abilityScoreIncreasesJson) || {})
                          .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
                          .join(", ")}
                      </span>
                    )}
                    {selectedItem.sensesJson && (
                      <span className="text-sm font-bold bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1.5 rounded-md shadow-sm">
                        Senses:{" "}
                        {Object.entries(parseRawJson(selectedItem.sensesJson) || {})
                          .map(([k, v]) => `${k} ${v}ft`)
                          .join(", ")}
                      </span>
                    )}
                    {selectedItem.languagesJson && (
                      <span className="text-sm font-bold bg-purple-500/10 border border-purple-500/20 text-purple-500 px-3 py-1.5 rounded-md shadow-sm">
                        Languages: {(parseRawJson(selectedItem.languagesJson) || []).join(", ")}
                      </span>
                    )}
                  </div>
                )}

                {/* Open5e Text fields (desc) & DB Spells */}
                {(selectedItem.desc || selectedItem.description) &&
                  activeTab !== "rules" &&
                  activeTab !== "classes" &&
                  activeTab !== "races" && (
                    <div className="whitespace-pre-wrap text-foreground/90">
                      {selectedItem.desc || selectedItem.description}
                    </div>
                  )}
                {(selectedItem.higher_level || selectedItem.higherLevel) && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <strong className="text-primary block mb-1">At Higher Levels:</strong>
                    <span className="text-foreground/90">
                      {selectedItem.higher_level || selectedItem.higherLevel}
                    </span>
                  </div>
                )}

                {/* DB Species Features */}
                {selectedItem.featuresJson && (
                  <div>
                    <h3 className="text-2xl font-bold mt-6 mb-4 border-b border-border/40 pb-2">
                      Species Features
                    </h3>
                    <ul className="space-y-4">
                      {(parseRawJson(selectedItem.featuresJson) || []).map(
                        (feature: any, idx: number) => (
                          <li
                            key={idx}
                            className="bg-secondary/20 p-4 rounded-lg border border-border/30"
                          >
                            <strong className="text-primary block text-lg mb-1">
                              {feature.name}
                            </strong>
                            {feature.html ? (
                              <div
                                className="text-foreground/80 prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(feature.html) }}
                              />
                            ) : (
                              <span className="text-foreground/80">{feature.description}</span>
                            )}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {/* Races Features */}
                {selectedItem.features && Array.isArray(selectedItem.features) && (
                  <div>
                    <h3 className="text-2xl font-bold mt-6 mb-4 border-b border-border/40 pb-2">
                      Racial Features
                    </h3>
                    <ul className="space-y-4">
                      {selectedItem.features.map((feature: any, idx: number) => (
                        <li
                          key={idx}
                          className="bg-secondary/20 p-4 rounded-lg border border-border/30"
                        >
                          <strong className="text-primary block text-lg mb-1">
                            {feature.name}
                          </strong>
                          <span className="text-foreground/80">{feature.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Classes Features */}
                {selectedItem.hitDice && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-secondary/30 p-5 rounded-xl border border-border/30">
                        <span className="font-bold block text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          Hit Dice
                        </span>
                        <span className="text-3xl font-black text-amber-500">
                          1d{selectedItem.hitDice}
                        </span>{" "}
                        <span className="text-sm text-muted-foreground">per level</span>
                      </div>
                      <div className="bg-secondary/30 p-5 rounded-xl border border-border/30">
                        <span className="font-bold block text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          Primary Abilities
                        </span>
                        <span className="text-2xl font-black text-primary">
                          {selectedItem.primaryAbilityJson
                            ? formatPrimaryAbility(selectedItem.primaryAbilityJson)
                            : ""}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold mt-8 mb-4 border-b border-border/40 pb-2">
                      Class Features
                    </h3>
                    {selectedItem.featuresByLevel &&
                      Object.entries(selectedItem.featuresByLevel).map(
                        ([level, features]: [string, any]) => (
                          <div key={level} className="mt-6">
                            <h4 className="font-bold text-xl text-primary inline-flex items-center gap-2 mb-3 bg-primary/10 px-3 py-1 rounded-md">
                              Level {level}
                            </h4>
                            <div className="space-y-3">
                              {features.map((feature: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-secondary/10 p-4 rounded-lg border-l-4 border-l-primary/50"
                                >
                                  <strong className="block text-lg mb-1">{feature.name}</strong>
                                  <span className="text-foreground/80 leading-relaxed">
                                    {feature.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                )}

                {/* Monster Stats Grid */}
                {(selectedItem.challengeRating !== undefined ||
                  selectedItem.challenge_rating !== undefined) && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-center">
                        <span className="block text-destructive font-bold uppercase tracking-wider text-[10px]">
                          Armor Class
                        </span>
                        <span className="text-2xl font-black">
                          {selectedItem.acJson
                            ? (parseRawJson(selectedItem.acJson) || [])[0]?.value
                            : selectedItem.armor_class}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                        <span className="block text-emerald-500 font-bold uppercase tracking-wider text-[10px]">
                          Hit Points
                        </span>
                        <span className="text-2xl font-black">
                          {selectedItem.hpJson
                            ? (parseRawJson(selectedItem.hpJson) || {}).average
                            : selectedItem.hit_points}
                        </span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-center">
                        <span className="block text-amber-500 font-bold uppercase tracking-wider text-[10px]">
                          Speed
                        </span>
                        <span className="text-lg font-bold">
                          {selectedItem.speedJson
                            ? Object.entries(parseRawJson(selectedItem.speedJson) || {})
                                .map(([k, v]) => `${k} ${v}ft`)
                                .join(", ")
                            : selectedItem.speed
                              ? Object.entries(selectedItem.speed)
                                  .map(([k, v]) => `${k} ${v}ft`)
                                  .join(", ")
                              : "30ft"}
                        </span>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg text-center">
                        <span className="block text-purple-500 font-bold uppercase tracking-wider text-[10px]">
                          Challenge
                        </span>
                        <span className="text-2xl font-black">
                          {selectedItem.challengeRating ?? selectedItem.challenge_rating}
                        </span>
                      </div>
                    </div>

                    {/* Monster Actions */}
                    {(selectedItem.actionsJson || selectedItem.actions) && (
                      <div className="mt-8">
                        <h3 className="text-2xl font-bold border-b border-destructive/50 text-destructive pb-2 mb-4">
                          Actions
                        </h3>
                        <div className="space-y-4">
                          {(selectedItem.actionsJson
                            ? parseRawJson(selectedItem.actionsJson) || []
                            : selectedItem.actions || []
                          ).map((act: any, i: number) => (
                            <div key={i} className="p-4 bg-secondary/10 rounded-lg">
                              <strong className="text-lg block text-foreground mb-1">
                                {act.name}
                              </strong>
                              <span className="text-foreground/80">
                                {act.desc || act.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {fluff?.entries && (
                  <div className="mt-8 border-t border-border/30 pt-6">
                    <h3 className="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
                      <BookOpen className="h-6 w-6" /> Lore & Details
                    </h3>
                    <EntryRenderer entry={fluff.entries} />
                  </div>
                )}
              </CardContent>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {isLoading ? "Consulting..." : "Select an entry to view details"}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
