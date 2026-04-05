// Rulesets Function - Rules configuration, lookups
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface Ruleset { id: string; name: string; version: string; description: string; abilities: string[]; skills: Record<string,string>; conditions: string[]; dice: string[]; classes: Record<string,any>; races: Record<string,any>; features: Record<string,any>; source: string }

const rulesets = new Map<string, Ruleset>()

const dnd5e: Ruleset = {
  id: 'dnd5e',
  name: 'D&D 5th Edition',
  version: '5.1',
  description: 'Dungeons & Dragons 5th Edition SRD',
  abilities: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
  skills: { acrobatics: 'dexterity', 'animal handling': 'wisdom', arcana: 'intelligence', athletics: 'strength', deception: 'charisma', history: 'intelligence', insight: 'wisdom', intimidation: 'charisma', investigation: 'intelligence', medicine: 'wisdom', nature: 'intelligence', perception: 'wisdom', performance: 'charisma', persuasion: 'charisma', religion: 'intelligence', 'sleight of hand': 'dexterity', stealth: 'dexterity', survival: 'wisdom' },
  conditions: ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhausted'],
  dice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'],
  classes: { barbarian: { hitDie: 12, primaryAbility: 'strength', saves: ['strength', 'constitution'] }, bard: { hitDie: 8, primaryAbility: 'charisma', saves: ['dexterity', 'charisma'] }, cleric: { hitDie: 8, primaryAbility: 'wisdom', saves: ['wisdom', 'charisma'] }, druid: { hitDie: 8, primaryAbility: 'wisdom', saves: ['intelligence', 'wisdom'] }, fighter: { hitDie: 10, primaryAbility: 'strength', saves: ['strength', 'constitution'] }, monk: { hitDie: 8, primaryAbility: 'dexterity', saves: ['strength', 'dexterity'] }, paladin: { hitDie: 10, primaryAbility: 'charisma', saves: ['wisdom', 'charisma'] }, ranger: { hitDie: 10, primaryAbility: 'dexterity', saves: ['strength', 'dexterity'] }, rogue: { hitDie: 8, primaryAbility: 'dexterity', saves: ['dexterity', 'intelligence'] }, sorcerer: { hitDie: 6, primaryAbility: 'charisma', saves: ['constitution', 'charisma'] }, warlock: { hitDie: 8, primaryAbility: 'charisma', saves: ['wisdom', 'charisma'] }, wizard: { hitDie: 6, primaryAbility: 'intelligence', saves: ['intelligence', 'wisdom'] } },
  races: { human: { bonuses: { all: 1 }, speed: 30 }, elf: { bonuses: { dexterity: 2 }, speed: 30 }, dwarf: { bonuses: { constitution: 2 }, speed: 25 }, halfling: { bonuses: { dexterity: 2 }, speed: 25 }, dragonborn: { bonuses: { strength: 2, charisma: 1 }, speed: 30 }, gnome: { bonuses: { intelligence: 2 }, speed: 25 }, 'half-elf': { bonuses: { charisma: 2 }, speed: 30 }, 'half-orc': { bonuses: { strength: 2, constitution: 1 }, speed: 30 }, tiefling: { bonuses: { charisma: 2, intelligence: 1 }, speed: 30 } },
  features: {},
  source: 'SRD'
}

const pathfinder2e: Ruleset = {
  id: 'pathfinder2e',
  name: 'Pathfinder 2nd Edition',
  version: '2.0',
  description: 'Pathfinder 2nd Edition Core Rules',
  abilities: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
  skills: { acrobatics: 'dexterity', arcana: 'intelligence', athletics: 'strength', crafting: 'intelligence', deception: 'charisma', diplomacy: 'charisma', intimidation: 'charisma', medicine: 'wisdom', nature: 'wisdom', occultism: 'intelligence', performance: 'charisma', religion: 'wisdom', society: 'intelligence', stealth: 'dexterity', survival: 'wisdom', thievery: 'dexterity' },
  conditions: ['blinded', 'broken', 'clumsy', 'confused', 'controlled', 'dazzled', 'deafened', 'doomed', 'drained', 'dying', 'encumbered', 'enfeebled', 'fascinated', 'fatigued', 'flat-footed', 'fleeing', 'frightened', 'grabbed', 'hidden', 'immobilized', 'invisible', 'paralyzed', 'petrified', 'prone', 'quickened', 'restrained', 'sick', 'slowed', 'stunned', 'stupefied', 'unconscious', 'undetected', 'wounded'],
  dice: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
  classes: {},
  races: {},
  features: {},
  source: 'OGL'
}

rulesets.set(dnd5e.id, dnd5e)
rulesets.set(pathfinder2e.id, pathfinder2e)

async function listRulesets(): Promise<Ruleset[]> { return Array.from(rulesets.values()) }
async function getRuleset(id: string): Promise<Ruleset | null> { return rulesets.get(id) || null }
async function getSkills(rulesetId: string): Promise<Record<string,string> | null> { const ruleset = rulesets.get(rulesetId); return ruleset?.skills || null }
async function getConditions(rulesetId: string): Promise<string[] | null> { const ruleset = rulesets.get(rulesetId); return ruleset?.conditions || null }
async function getClasses(rulesetId: string): Promise<Record<string,any> | null> { const ruleset = rulesets.get(rulesetId); return ruleset?.classes || null }
async function getRaces(rulesetId: string): Promise<Record<string,any> | null> { const ruleset = rulesets.get(rulesetId); return ruleset?.races || null }

serve(async (req: Request) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" }
  if (req.method === "OPTIONS") return new Response(null, { headers })
  const url = new URL(req.url)
  const path = url.pathname.replace("/functions/v1/rulesets", "")
  try {
    if (req.method === "GET" && path === "/health") return new Response(JSON.stringify({ status: 'ok', features: ['rulesets', 'skills', 'conditions', 'classes', 'races'] }), { headers: { ...headers, "Content-Type": "application/json" } })
    if (req.method === "GET" && path === "/rulesets") { const list = await listRulesets(); return new Response(JSON.stringify(list), { headers: { ...headers, "Content-Type": "application/json" } }) }
    if (req.method === "GET" && path.match(/^\/rulesets\/[\w-]+$/)) { const id = path.split("/")[2]; const ruleset = await getRuleset(id); if (!ruleset) return new Response(JSON.stringify({ error: "Ruleset not found" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } }); return new Response(JSON.stringify(ruleset), { headers: { ...headers, "Content-Type": "application/json" } }) }
    if (req.method === "GET" && path.match(/^\/rulesets\/[\w-]+\/skills$/)) { const id = path.split("/")[2]; const skills = await getSkills(id); return new Response(JSON.stringify(skills), { headers: { ...headers, "Content-Type": "application/json" } }) }
    if (req.method === "GET" && path.match(/^\/rulesets\/[\w-]+\/conditions$/)) { const id = path.split("/")[2]; const conditions = await getConditions(id); return new Response(JSON.stringify(conditions), { headers: { ...headers, "Content-Type": "application/json" } }) }
    if (req.method === "GET" && path.match(/^\/rulesets\/[\w-]+\/classes$/)) { const id = path.split("/")[2]; const classes = await getClasses(id); return new Response(JSON.stringify(classes), { headers: { ...headers, "Content-Type": "application/json" } }) }
    if (req.method === "GET" && path.match(/^\/rulesets\/[\w-]+\/races$/)) { const id = path.split("/")[2]; const races = await getRaces(id); return new Response(JSON.stringify(races), { headers: { ...headers, "Content-Type": "application/json" } }) }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...headers, "Content-Type": "application/json" } })
  } catch (error) { return new Response(JSON.stringify({ error: "Internal server error", message: error.message }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } }) }
})
