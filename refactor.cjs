const fs = require('fs');
const path = require('path');

const file = fs.readFileSync('./src/routes/index.tsx', 'utf-8');
const lines = file.split('\n');

function getBlock(startKeyword, endKeywordOrRegex, linesArray) {
  let startIdx = linesArray.findIndex(l => l.startsWith(startKeyword));
  if (startIdx === -1) return null;
  
  let endIdx = -1;
  for (let i = startIdx + 1; i < linesArray.length; i++) {
    if (typeof endKeywordOrRegex === 'string' ? linesArray[i].startsWith(endKeywordOrRegex) : endKeywordOrRegex.test(linesArray[i])) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) endIdx = linesArray.length;
  
  return {
    content: linesArray.slice(startIdx, endIdx).join('\n'),
    start: startIdx,
    end: endIdx
  };
}

// Just slice by known line numbers from earlier grep!
const sliceLines = (s, e) => lines.slice(s - 1, e).join('\n');

const storageKey = sliceLines(14, 15);
const readStoredIds = sliceLines(16, 29);
const partyQueryOptions = sliceLines(30, 40);
const routeDef = sliceLines(41, 53);
const indexComp = sliceLines(54, 107);
const partyGridSkeleton = sliceLines(108, 147);
const refreshButton = sliceLines(148, 163);
const partyGrid = sliceLines(164, 174);
const characterCard = sliceLines(175, 604);
const inventoryList = sliceLines(605, 623);
const inventoryGroup = sliceLines(624, 666);
const partyHighlights = sliceLines(667, 740);
const condIcon = sliceLines(741, 748);
const readAllCond = sliceLines(749, 760);
const useCond = sliceLines(761, 796);
const condPanel = sliceLines(797, 826);
const condChip = sliceLines(827, 879);
const parseId = sliceLines(880, 888);
const manageDialog = sliceLines(889, 1036);
const section = sliceLines(1037, 1056);
const stat = sliceLines(1057, lines.length);

const imports = sliceLines(1, 13);

fs.mkdirSync('./src/components/party', { recursive: true });

// ManagePartyDialog.tsx
fs.writeFileSync('./src/components/party/ManagePartyDialog.tsx', `
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";

${parseId}
${manageDialog.replace('function ManagePartyDialog', 'export function ManagePartyDialog')}
`.trim());

// PartyHighlights.tsx
fs.writeFileSync('./src/components/party/PartyHighlights.tsx', `
import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Eye, Flame, Heart } from "lucide-react";

${partyHighlights.replace('function PartyHighlights', 'export function PartyHighlights')}
`.trim());

// CharacterCard.tsx (also has Section, Stat, Inventory, Conditions)
fs.writeFileSync('./src/components/party/CharacterCard.tsx', `
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff, EarOff, Ghost, Hand, Ban, Snowflake, Mountain, FlaskConical, ArrowDown, Lock, Zap, Moon, Brain, Heart, Flame, HeartCrack, Skull, Sparkles, AlertCircle } from "lucide-react";
import { PartyMember, InventoryItem } from "@/lib/dndbeyond.functions";

${section}
${stat}
${condIcon}
${readAllCond}
${useCond}
${condChip}
${condPanel}
${inventoryGroup}
${inventoryList}
${characterCard.replace('function CharacterCard', 'export function CharacterCard')}
`.trim());

// PartyGrid.tsx
fs.writeFileSync('./src/components/party/PartyGrid.tsx', `
import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { Skeleton } from "@/components/ui/skeleton";
import { CharacterCard } from "./CharacterCard";

${partyGridSkeleton.replace('function PartyGridSkeleton', 'export function PartyGridSkeleton')}
${partyGrid.replace('function PartyGrid', 'export function PartyGrid')}
`.trim());

// RefreshButton.tsx
fs.writeFileSync('./src/components/party/RefreshButton.tsx', `
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";

${refreshButton.replace('function RefreshButton', 'export function RefreshButton')}
`.trim());

// lib/party.ts
fs.writeFileSync('./src/lib/party.ts', `
import { queryOptions } from "@tanstack/react-query";
import { getParty } from "@/lib/dndbeyond.functions";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";

export ${storageKey}
export ${readStoredIds}
export ${partyQueryOptions}
`.trim());

// Updated index.tsx
fs.writeFileSync('./src/routes/index.tsx', `
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readStoredIds, partyQueryOptions, STORAGE_KEY } from "@/lib/party";

import { RefreshButton } from "@/components/party/RefreshButton";
import { PartyHighlights } from "@/components/party/PartyHighlights";
import { PartyGrid, PartyGridSkeleton } from "@/components/party/PartyGrid";
import { ManagePartyDialog } from "@/components/party/ManagePartyDialog";

${routeDef}
${indexComp.replace('function Index', 'export default function Index')}
`.trim());

console.log('Refactor complete!');
