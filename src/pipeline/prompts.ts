// import { invoke_subagent } from '../api/agent'; // Pseudocode for what the app will eventually do

// For now, I (the parent agent) will invoke the subagents via my tools.
// This file serves as documentation for the exact prompts the pipeline uses.

export const EXTRACTOR_PROMPT = `
You are the Extractor Subagent. 
Read the following Markdown text and extract all D&D 2024 Spells.
Output raw JSON matching the provided Zod schema. Do not hallucinate math.
`;

export const CALCULATOR_PROMPT = `
You are the Calculator Subagent.
Read the raw JSON and convert human-readable text into strict Mathematical ActiveEffects.
`;

export const AUDITOR_PROMPT = `
You are the Auditor Subagent.
Compare the calculated JSON against the original Markdown text. 
If you find any discrepancies (e.g. 1d8 instead of 1d10), output an Error Report.
Otherwise, output "PASS".
`;
