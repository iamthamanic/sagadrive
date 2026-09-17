/**
 * generate-builtin-npc-creature-icons.mjs
 * LEGACY geometric fallback only. Production icons use Cursor PNG → VTracer
 * (`scripts/vectorize-npc-creature-icons.mjs`), same pipeline as items.
 *
 * Usage: node scripts/generate-builtin-npc-creature-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/assets/npc-creatures');

const STROKE = '#1a1f28';
const F = {
  iron: '#9aa3ad',
  ironMid: '#7a8490',
  ironDark: '#5c6570',
  leather: '#3d2914',
  wood: '#6b4a2e',
  red: '#c43c3c',
  green: '#3d8f5a',
  gold: '#c4a035',
  skin: '#c4a07a',
  robe: '#4a5568',
  fur: '#6b5344',
  furLight: '#8a6f58',
  bone: '#e8ecf0',
  scale: '#3d8f5a',
  scaleDark: '#2a5c3a',
  ghost: '#b8c4d0',
  stone: '#7a8490',
  cloth: '#3b6ea5',
};

function svg(label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(label)}">
  <!-- SagaDrive npc-creature icon: ${escapeXml(label)}. Flat vector, transparent bg, ≤6 colors. -->
  <g stroke="${STROKE}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">
${body}
  </g>
</svg>
`;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Bust + head silhouette for humanoid NPCs. */
function humanoid({ headFill = F.skin, bodyFill = F.robe, accent = F.ironDark }) {
  return `
    <ellipse fill="${headFill}" cx="256" cy="150" rx="70" ry="78"/>
    <path fill="${bodyFill}" d="M140 250c20-40 70-56 116-56s96 16 116 56l24 180H116z"/>
    <path fill="${accent}" d="M200 250h112v28H200z"/>`;
}

function elder() {
  return `
    ${humanoid({ bodyFill: F.cloth, accent: F.gold })}
    <path fill="${F.bone}" d="M186 120c20-40 60-50 70-20 10-30 50-20 70 20-30 10-50 40-70 40s-40-30-70-40z"/>
    <circle fill="${F.gold}" cx="256" cy="320" r="14"/>`;
}

function militia() {
  return `
    ${humanoid({ bodyFill: F.ironMid, accent: F.leather })}
    <path fill="${F.iron}" d="M300 200l90 40-20 36-70-30z"/>
    <rect fill="${F.wood}" x="360" y="180" width="18" height="120" rx="3"/>
    <path fill="${F.ironDark}" d="M170 220h50v90H170z"/>`;
}

function hedgeMage() {
  return `
    ${humanoid({ bodyFill: F.robe, accent: F.green })}
    <path fill="${F.robe}" d="M190 70h132l-20 60H210z"/>
    <circle fill="${F.green}" cx="340" cy="300" r="28"/>
    <path fill="none" d="M340 272v56M312 300h56"/>`;
}

function knight() {
  return `
    ${humanoid({ headFill: F.iron, bodyFill: F.ironMid, accent: F.gold })}
    <path fill="${F.ironDark}" d="M186 100h140v40H186z"/>
    <path fill="${F.iron}" d="M330 210l70 20v90l-70 16z"/>
    <rect fill="${F.red}" x="348" y="230" width="36" height="50" rx="2"/>`;
}

function goblin() {
  return `
    <ellipse fill="${F.scale}" cx="256" cy="170" rx="72" ry="78"/>
    <path fill="${F.scaleDark}" d="M150 150l-40-60 50 20M362 150l40-60-50 20"/>
    <path fill="${F.scale}" d="M160 260c20-36 60-50 96-50s76 14 96 50l16 160H144z"/>
    <circle fill="${F.gold}" cx="230" cy="160" r="10"/>
    <circle fill="${F.gold}" cx="282" cy="160" r="10"/>`;
}

function orc() {
  return `
    <ellipse fill="${F.scaleDark}" cx="256" cy="150" rx="80" ry="86"/>
    <path fill="${F.bone}" d="M210 180l-20 30 24-8M302 180l20 30-24-8"/>
    <path fill="${F.fur}" d="M140 250c24-44 78-60 116-60s92 16 116 60l20 180H120z"/>
    <path fill="${F.iron}" d="M120 300h80v36H120zm192 0h80v36h-80z"/>`;
}

function dragon() {
  return `
    <path fill="${F.scale}" d="M120 280c40-120 120-180 180-180 40 0 90 40 110 100l40 40-50 20c-20 60-70 120-140 140-80 20-140-20-140-120z"/>
    <path fill="${F.scaleDark}" d="M280 140l60-70 10 50M320 160l70-40 4 48"/>
    <path fill="${F.red}" d="M360 260c30 10 50 30 40 50-20-10-40-20-40-50z"/>
    <circle fill="${F.gold}" cx="340" cy="220" r="12"/>`;
}

function skeleton() {
  return `
    <circle fill="${F.bone}" cx="256" cy="140" r="70"/>
    <path fill="none" d="M230 150h20M262 150h20M236 180h40"/>
    <path fill="${F.bone}" d="M236 210h40v140H236z"/>
    <path fill="none" d="M236 250h40M236 280h40M236 310h40"/>
    <path fill="${F.bone}" d="M180 230h56v24H180zm96 0h56v24h-56z"/>
    <path fill="${F.bone}" d="M220 350h28v80H220zm44 0h28v80h-28z"/>`;
}

function wolf() {
  return `
    <ellipse fill="${F.fur}" cx="256" cy="280" rx="140" ry="70"/>
    <ellipse fill="${F.furLight}" cx="360" cy="220" rx="70" ry="56"/>
    <path fill="${F.fur}" d="M320 160l30-50 20 40M380 160l40-40 4 48"/>
    <circle fill="${F.gold}" cx="390" cy="210" r="8"/>
    <path fill="${F.leather}" d="M400 230l40 10-36 16z"/>
    <path fill="${F.fur}" d="M140 280l-40 60 30-10M180 300l-20 70 30-16"/>`;
}

function bear() {
  return `
    <ellipse fill="${F.fur}" cx="256" cy="280" rx="150" ry="90"/>
    <circle fill="${F.fur}" cx="256" cy="170" r="80"/>
    <circle fill="${F.furLight}" cx="190" cy="120" r="28"/>
    <circle fill="${F.furLight}" cx="322" cy="120" r="28"/>
    <ellipse fill="${F.leather}" cx="256" cy="190" rx="28" ry="20"/>
    <circle fill="${F.gold}" cx="230" cy="160" r="8"/>
    <circle fill="${F.gold}" cx="282" cy="160" r="8"/>`;
}

function hawk() {
  return `
    <path fill="${F.fur}" d="M256 120c40 20 70 80 60 140l-60 100-60-100c-10-60 20-120 60-140z"/>
    <path fill="${F.furLight}" d="M160 200c-40 20-70 60-60 90 50-10 90-30 120-60z"/>
    <path fill="${F.furLight}" d="M352 200c40 20 70 60 60 90-50-10-90-30-120-60z"/>
    <path fill="${F.gold}" d="M256 280l16 40h-32z"/>
    <circle fill="${F.gold}" cx="270" cy="180" r="8"/>`;
}

function horse() {
  return `
    <ellipse fill="${F.furLight}" cx="240" cy="300" rx="130" ry="70"/>
    <path fill="${F.furLight}" d="M320 220c40-60 80-80 100-40l20 80-80 20z"/>
    <path fill="${F.fur}" d="M380 170c10-40 40-50 50-20-20 10-30 40-50 40z"/>
    <rect fill="${F.fur}" x="160" y="350" width="28" height="90" rx="6"/>
    <rect fill="${F.fur}" x="220" y="360" width="28" height="80" rx="6"/>
    <rect fill="${F.fur}" x="280" y="350" width="28" height="90" rx="6"/>
    <rect fill="${F.fur}" x="330" y="360" width="28" height="80" rx="6"/>`;
}

function snake() {
  return `
    <path fill="${F.scale}" d="M120 340c40-80 80-40 120-80s60-100 120-80 80 60 40 100-80 20-120 60-100 60-140 40-40-20-20-40z"/>
    <ellipse fill="${F.scaleDark}" cx="380" cy="200" rx="50" ry="36"/>
    <circle fill="${F.gold}" cx="400" cy="190" r="8"/>
    <path fill="${F.red}" d="M420 210l30 8-28 12z"/>`;
}

function boar() {
  return `
    <ellipse fill="${F.fur}" cx="250" cy="290" rx="130" ry="80"/>
    <ellipse fill="${F.furLight}" cx="360" cy="250" rx="70" ry="56"/>
    <path fill="${F.bone}" d="M320 240l-30-40 10 40M360 230l20-50 8 48"/>
    <ellipse fill="${F.leather}" cx="390" cy="260" rx="24" ry="16"/>
    <circle fill="${F.gold}" cx="370" cy="240" r="7"/>
    <rect fill="${F.fur}" x="180" y="350" width="30" height="70" rx="6"/>
    <rect fill="${F.fur}" x="280" y="350" width="30" height="70" rx="6"/>`;
}

function direWolf() {
  return `
    ${wolf()}
    <path fill="${F.fur}" d="M300 140l40-70 16 50M360 130l50-60 8 56"/>
    <path fill="${F.red}" d="M410 230l36 12-32 14z"/>`;
}

function ratSwarm() {
  return `
    <ellipse fill="${F.fur}" cx="180" cy="300" rx="50" ry="30"/>
    <ellipse fill="${F.fur}" cx="260" cy="280" rx="55" ry="32"/>
    <ellipse fill="${F.fur}" cx="340" cy="310" rx="48" ry="28"/>
    <circle fill="${F.furLight}" cx="220" cy="250" r="28"/>
    <circle fill="${F.furLight}" cx="300" cy="240" r="30"/>
    <circle fill="${F.furLight}" cx="370" cy="270" r="26"/>
    <path fill="none" d="M240 250q40-40 80 0M320 240q30-30 60 10"/>`;
}

function wraith() {
  return `
    <ellipse fill="${F.ghost}" cx="256" cy="160" rx="64" ry="72"/>
    <path fill="${F.ghost}" d="M160 240c30-50 70-70 96-70s66 20 96 70c20 80 30 140 0 180H160c-30-40-20-100 0-180z" opacity="0.95"/>
    <circle fill="${F.ironDark}" cx="232" cy="150" r="10"/>
    <circle fill="${F.ironDark}" cx="280" cy="150" r="10"/>
    <path fill="none" d="M200 400c20 20 40 20 56 0s36-20 56 0"/>`;
}

function golem() {
  return `
    <rect fill="${F.stone}" x="176" y="100" width="160" height="140" rx="16"/>
    <rect fill="${F.ironDark}" x="150" y="250" width="212" height="180" rx="12"/>
    <rect fill="${F.iron}" x="190" y="160" width="40" height="24" rx="4"/>
    <rect fill="${F.iron}" x="282" y="160" width="40" height="24" rx="4"/>
    <rect fill="${F.gold}" x="232" y="300" width="48" height="48" rx="6"/>
    <path fill="${F.stone}" d="M120 270h40v120H120zm232 0h40v120h-40z"/>`;
}

function zombie() {
  return `
    <ellipse fill="${F.scale}" cx="256" cy="150" rx="70" ry="78"/>
    <path fill="${F.robe}" d="M140 250c20-40 70-56 116-56s96 16 116 56l24 180H116z"/>
    <path fill="${F.bone}" d="M200 300h40v70H200zm80 40h50v24h-50z"/>
    <circle fill="${F.red}" cx="232" cy="145" r="8"/>
    <circle fill="${F.red}" cx="280" cy="145" r="8"/>`;
}

const ICONS = {
  'builtin-npc-fantasy-village-elder': { label: 'Dorfälteste', body: elder(), prompt: 'wise village elder woman, cloak and silver hair' },
  'builtin-npc-fantasy-militia': { label: 'Milizsoldat', body: militia(), prompt: 'village militia soldier with spear and small shield' },
  'builtin-npc-fantasy-hedge-mage': { label: 'Heckenmagier', body: hedgeMage(), prompt: 'hedge mage with pointed hat and glowing orb' },
  'builtin-npc-fantasy-knight': { label: 'Ritter', body: knight(), prompt: 'armored knight with helmet and heater shield' },
  'builtin-creature-fantasy-goblin': { label: 'Goblin', body: goblin(), prompt: 'green goblin with pointed ears, sly posture' },
  'builtin-creature-fantasy-orc-raider': { label: 'Ork-Räuber', body: orc(), prompt: 'orc raider with tusks and brute shoulders' },
  'builtin-creature-fantasy-young-dragon': { label: 'Junger Drache', body: dragon(), prompt: 'young dragon head and wing silhouette' },
  'builtin-creature-fantasy-skeleton': { label: 'Skelett', body: skeleton(), prompt: 'bare undead skeleton skull and upper ribcage on black background, pristine complete unbroken cranium, mid-beige bones, no armor no cloth' },
  'builtin-creature-animal-wolf': { label: 'Wolf', body: wolf(), prompt: 'wolf side silhouette' },
  'builtin-creature-animal-bear': { label: 'Bär', body: bear(), prompt: 'bear facing forward silhouette' },
  'builtin-creature-animal-hawk': { label: 'Habicht', body: hawk(), prompt: 'hawk with spread wings' },
  'builtin-creature-animal-horse': { label: 'Pferd', body: horse(), prompt: 'horse side silhouette' },
  'builtin-creature-animal-snake': { label: 'Schlange', body: snake(), prompt: 'coiled snake silhouette' },
  'builtin-creature-animal-boar': { label: 'Wildschwein', body: boar(), prompt: 'boar with tusks silhouette' },
  'builtin-creature-animal-dire-wolf': { label: 'Schreckenswolf', body: direWolf(), prompt: 'large dire wolf with raised ears' },
  'builtin-creature-animal-rat-swarm': { label: 'Rattenschwarm', body: ratSwarm(), prompt: 'cluster of rats swarm silhouette' },
  'builtin-creature-undead-wraith': { label: 'Geistwesen', body: wraith(), prompt: 'ghostly wraith floating hooded form' },
  'builtin-creature-construct-golem': { label: 'Golem', body: golem(), prompt: 'stone golem blocky humanoid' },
  'builtin-creature-undead-zombie': { label: 'Zombie', body: zombie(), prompt: 'zombie shambling humanoid' },
};

mkdirSync(outDir, { recursive: true });

let written = 0;
const manifest = [];

for (const [slug, { label, body, prompt }] of Object.entries(ICONS)) {
  const file = join(outDir, `${slug}.svg`);
  writeFileSync(file, svg(label, body), 'utf8');
  written += 1;
  const catalogId = slug.replace(/-/g, '.');
  manifest.push({
    id: catalogId,
    slug,
    name: label,
    iconPrompt: prompt,
    iconKey: slug,
    sourcePng: `assets/npc-creature-icon-sources/${slug}.png`,
    outputSvg: `public/assets/npc-creatures/${slug}.svg`,
    status: 'ready',
  });
}

const manifestPath = join(root, 'assets/npc-creature-icons.manifest.json');
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Wrote ${written} SVGs to ${outDir}`);
console.log(`Wrote manifest (${manifest.length}) to ${manifestPath}`);
if (written !== 19) {
  console.error(`Expected 19 icons, got ${written}`);
  process.exit(1);
}
