/**
 * generate-builtin-item-icons.mjs
 * Writes flat SagaDrive inventory SVGs for all builtin-standard catalog items
 * (+ core footwear). Style matches public/assets/items/iron-longsword.svg.
 *
 * Usage: node scripts/generate-builtin-item-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/assets/items');

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
  panel: '#2a3340',
  panelMid: '#3d4a5c',
  cyan: '#3db8c5',
  teal: '#2a8f9a',
  light: '#b8c4d0',
  plastic: '#4a5568',
  plasticMid: '#6b7280',
  white: '#e8ecf0',
  blue: '#3b6ea5',
  orange: '#d97706',
  brown: '#5c4033',
};

function svg(label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(label)}">
  <!-- SagaDrive item icon: ${escapeXml(label)}. Flat vector, transparent bg, ≤6 colors. -->
  <g stroke="${STROKE}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">
${body}
  </g>
</svg>
`;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function sword({ bladeH, tipY = 40, fill = F.iron, grip = F.leather, guard = F.ironDark, fuller = F.ironMid }) {
  const bladeTop = tipY + 36;
  const guardY = tipY + bladeH;
  return `
    <path fill="${fill}" d="M256 ${tipY}l22 36v${bladeH - 36}H234V${bladeTop}z"/>
    <rect fill="${fuller}" stroke="none" x="252" y="${bladeTop + 8}" width="8" height="${bladeH - 60}" rx="2"/>
    <path fill="${guard}" d="M152 ${guardY}h208v26H152zm-18 4h22v18h-22zm222 0h22v18h-22z"/>
    <rect fill="${grip}" x="234" y="${guardY + 26}" width="44" height="90" rx="4"/>
    <path fill="none" d="M234 ${guardY + 48}h44M234 ${guardY + 70}h44M234 ${guardY + 92}h44"/>
    <circle fill="${guard}" cx="256" cy="${guardY + 136}" r="26"/>`;
}

function dagger() {
  return `
    <path fill="${F.iron}" d="M256 56l18 28v200H238V84z"/>
    <rect fill="${F.ironMid}" stroke="none" x="252" y="100" width="8" height="160" rx="2"/>
    <path fill="${F.ironDark}" d="M180 284h152v22H180z"/>
    <rect fill="${F.leather}" x="238" y="306" width="36" height="100" rx="4"/>
    <circle fill="${F.gold}" cx="256" cy="430" r="22"/>`;
}

function axe() {
  return `
    <rect fill="${F.wood}" x="244" y="80" width="24" height="320" rx="4"/>
    <path fill="${F.iron}" d="M268 100h120l-20 70 20 70H268z"/>
    <path fill="${F.ironDark}" d="M268 120h90l-12 50 12 50H268z"/>`;
}

function hammer() {
  return `
    <rect fill="${F.wood}" x="244" y="140" width="24" height="280" rx="4"/>
    <rect fill="${F.ironDark}" x="160" y="70" width="192" height="90" rx="8"/>
    <rect fill="${F.iron}" x="176" y="86" width="160" height="58" rx="4"/>`;
}

function spear() {
  return `
    <path fill="${F.iron}" d="M256 36l28 70H228z"/>
    <rect fill="${F.wood}" x="244" y="100" width="24" height="340" rx="3"/>
    <rect fill="${F.ironDark}" x="236" y="100" width="40" height="28" rx="2"/>`;
}

function staff() {
  return `
    <rect fill="${F.wood}" x="244" y="48" width="24" height="400" rx="8"/>
    <circle fill="${F.leather}" cx="256" cy="120" r="18"/>
    <circle fill="${F.leather}" cx="256" cy="280" r="18"/>
    <circle fill="${F.ironDark}" cx="256" cy="56" r="22"/>`;
}

function bow({ tall = false }) {
  const top = tall ? 40 : 70;
  const bot = tall ? 470 : 440;
  const mid = (top + bot) / 2;
  return `
    <path fill="none" stroke="${STROKE}" stroke-width="14" d="M180 ${top}C120 ${mid} 120 ${mid} 180 ${bot}"/>
    <path fill="${F.wood}" d="M176 ${top}c-8 0-16 8-16 18v${bot - top - 36}c0 10 8 18 16 18 4-40 8-80 8-${(bot - top) / 2}S180 ${top + 40} 176 ${top}z"/>
    <path fill="none" d="M192 ${top + 10}L320 ${mid}L192 ${bot - 10}"/>
    <circle fill="${F.leather}" cx="320" cy="${mid}" r="10"/>`;
}

function crossbow() {
  return `
    <rect fill="${F.wood}" x="236" y="160" width="40" height="260" rx="6"/>
    <path fill="${F.ironDark}" d="M96 200h320v36H96z"/>
    <path fill="${F.iron}" d="M110 208h292v20H110z"/>
    <rect fill="${F.leather}" x="246" y="300" width="20" height="90" rx="3"/>
    <path fill="none" d="M120 218L256 280L392 218"/>`;
}

function arrows({ bolts = false }) {
  const len = bolts ? 220 : 280;
  const y0 = bolts ? 140 : 100;
  return `
    <g>
      <path fill="${F.iron}" d="M200 ${y0}l12-24 12 24v${len}h-24z"/>
      <path fill="${F.red}" d="M200 ${y0 + len}h24l-12 40z"/>
      <path fill="${F.iron}" d="M248 ${y0 + 20}l12-24 12 24v${len}h-24z"/>
      <path fill="${F.gold}" d="M248 ${y0 + 20 + len}h24l-12 40z"/>
      <path fill="${F.iron}" d="M296 ${y0}l12-24 12 24v${len}h-24z"/>
      <path fill="${F.green}" d="M296 ${y0 + len}h24l-12 40z"/>
    </g>`;
}

function shield() {
  return `
    <path fill="${F.ironDark}" d="M256 60c80 20 140 40 140 120v80c0 90-60 160-140 200-80-40-140-110-140-200v-80c0-80 60-100 140-120z"/>
    <path fill="${F.iron}" d="M256 90c60 16 100 32 100 90v70c0 70-44 124-100 156-56-32-100-86-100-156v-70c0-58 40-74 100-90z"/>
    <circle fill="${F.gold}" cx="256" cy="220" r="28"/>`;
}

function armor({ kind }) {
  if (kind === 'leather') {
    return `
      <path fill="${F.leather}" d="M160 120h192l40 60v200H120V180z"/>
      <path fill="${F.brown}" d="M200 120v40h112v-40"/>
      <path fill="none" d="M180 220h152M180 280h152M180 340h152"/>`;
  }
  if (kind === 'chain') {
    return `
      <path fill="${F.ironDark}" d="M160 120h192l40 60v200H120V180z"/>
      <path fill="${F.iron}" d="M180 180h152v200H180z"/>
      <path fill="none" d="M200 200h20M240 200h20M280 200h20M220 240h20M260 240h20M200 280h20M240 280h20M280 280h20M220 320h20M260 320h20"/>`;
  }
  return `
    <path fill="${F.ironDark}" d="M150 110h212l48 70v210H102V180z"/>
    <path fill="${F.iron}" d="M176 180h160v200H176z"/>
    <rect fill="${F.ironMid}" x="200" y="200" width="112" height="40" rx="4"/>
    <rect fill="${F.ironMid}" x="210" y="260" width="92" height="80" rx="4"/>`;
}

function potion({ fill }) {
  return `
    <rect fill="${F.wood}" x="232" y="56" width="48" height="36" rx="4"/>
    <path fill="${F.light}" d="M220 92h72v40c40 20 56 60 56 110 0 70-40 140-92 140s-92-70-92-140c0-50 16-90 56-110z"/>
    <path fill="${fill}" d="M196 240c0 60 30 120 60 120s60-60 60-120c0-30-10-50-24-66H220c-14 16-24 36-24 66z"/>
    <path fill="none" stroke="${STROKE}" stroke-width="6" d="M240 160h32"/>`;
}

function rations() {
  return `
    <rect fill="${F.wood}" x="140" y="160" width="232" height="200" rx="16"/>
    <rect fill="${F.leather}" x="160" y="180" width="192" height="160" rx="8"/>
    <path fill="${F.gold}" d="M200 220h112v24H200zm0 48h112v24H200zm0 48h80v24h-80z"/>`;
}

function waterskin() {
  return `
    <path fill="${F.leather}" d="M200 100c-40 40-60 100-40 180 20 80 80 140 120 140s100-60 120-140c20-80 0-140-40-180-20-20-60-40-80-40s-60 20-80 40z"/>
    <rect fill="${F.wood}" x="236" y="70" width="40" height="50" rx="6"/>
    <circle fill="${F.ironDark}" cx="256" cy="280" r="18"/>`;
}

function torch() {
  return `
    <rect fill="${F.wood}" x="236" y="180" width="40" height="260" rx="6"/>
    <path fill="${F.orange}" d="M256 60c40 40 50 90 30 130-20 10-40 10-60 0-20-40-10-90 30-130z"/>
    <path fill="${F.gold}" d="M256 100c20 20 24 50 14 74h-28c-10-24-6-54 14-74z"/>`;
}

function lantern() {
  return `
    <rect fill="${F.ironDark}" x="200" y="80" width="112" height="36" rx="6"/>
    <path fill="none" d="M256 50v30M220 50h72"/>
    <rect fill="${F.gold}" x="190" y="116" width="132" height="220" rx="12"/>
    <rect fill="${F.light}" x="214" y="140" width="84" height="160" rx="6"/>
    <rect fill="${F.ironDark}" x="210" y="336" width="92" height="40" rx="6"/>`;
}

function rope() {
  return `
    <circle fill="${F.wood}" cx="256" cy="256" r="140"/>
    <circle fill="none" stroke="${STROKE}" stroke-width="28" cx="256" cy="256" r="90"/>
    <circle fill="${F.leather}" cx="256" cy="256" r="36"/>
    <path fill="${F.wood}" d="M256 116h40v40h-40z"/>`;
}

function grapplingHook() {
  return `
    <rect fill="${F.ironDark}" x="244" y="200" width="24" height="220" rx="4"/>
    <path fill="${F.iron}" d="M256 80l80 100h-50l-30-40-30 40h-50z"/>
    <path fill="${F.ironMid}" d="M180 200c-40 20-60 60-40 80 30-10 50-40 60-80zm152 0c40 20 60 60 40 80-30-10-50-40-60-80z"/>`;
}

function backpack({ modern = false }) {
  const fill = modern ? F.plastic : F.leather;
  const accent = modern ? F.blue : F.wood;
  return `
    <rect fill="${fill}" x="150" y="120" width="212" height="280" rx="24"/>
    <rect fill="${accent}" x="170" y="150" width="172" height="100" rx="12"/>
    <path fill="none" d="M180 100c0-40 152-40 152 0"/>
    <rect fill="${accent}" x="230" y="280" width="52" height="80" rx="8"/>`;
}

function pouch() {
  return `
    <path fill="${F.leather}" d="M160 180h192l24 180H136z"/>
    <rect fill="${F.wood}" x="180" y="140" width="152" height="50" rx="8"/>
    <circle fill="${F.gold}" cx="256" cy="165" r="12"/>`;
}

function tools({ medical = false }) {
  if (medical) {
    return `
      <rect fill="${F.white}" x="140" y="140" width="232" height="240" rx="16"/>
      <rect fill="${F.red}" x="230" y="180" width="52" height="160" rx="6"/>
      <rect fill="${F.red}" x="180" y="230" width="152" height="52" rx="6"/>`;
  }
  return `
    <rect fill="${F.wood}" x="150" y="160" width="212" height="200" rx="12"/>
    <rect fill="${F.iron}" x="180" y="100" width="28" height="120" rx="4"/>
    <rect fill="${F.ironDark}" x="240" y="120" width="28" height="100" rx="4"/>
    <rect fill="${F.ironMid}" x="300" y="90" width="28" height="130" rx="4"/>`;
}

function lockpicks() {
  return `
    <rect fill="${F.leather}" x="170" y="120" width="172" height="280" rx="12"/>
    <path fill="${F.iron}" d="M210 160h20v200h-20zm40 20h20v180h-20zm40-10h20v190h-20z"/>
    <circle fill="${F.ironDark}" cx="220" cy="150" r="10"/>
    <circle fill="${F.ironDark}" cx="260" cy="170" r="10"/>
    <circle fill="${F.ironDark}" cx="300" cy="160" r="10"/>`;
}

function mapDoc() {
  return `
    <rect fill="${F.light}" x="100" y="120" width="312" height="280" rx="8"/>
    <path fill="none" d="M140 180h80l40 40 60-80 80 60"/>
    <circle fill="${F.red}" cx="180" cy="320" r="14"/>
    <path fill="none" d="M200 300l80 40"/>`;
}

function compass() {
  return `
    <circle fill="${F.ironDark}" cx="256" cy="256" r="140"/>
    <circle fill="${F.light}" cx="256" cy="256" r="110"/>
    <path fill="${F.red}" d="M256 160l28 96H228z"/>
    <path fill="${F.ironDark}" d="M256 352l-28-96h56z"/>
    <circle fill="${F.gold}" cx="256" cy="256" r="16"/>`;
}

function writingKit() {
  return `
    <rect fill="${F.wood}" x="140" y="180" width="232" height="160" rx="12"/>
    <rect fill="${F.ironDark}" x="300" y="100" width="28" height="220" rx="6"/>
    <path fill="${F.iron}" d="M300 100l28 0 0 40-14 24-14-24z"/>
    <rect fill="${F.light}" x="160" y="200" width="120" height="120" rx="4"/>`;
}

function letter() {
  return `
    <rect fill="${F.light}" x="110" y="140" width="292" height="220" rx="8"/>
    <path fill="none" d="M110 140l146 110L402 140"/>
    <circle fill="${F.red}" cx="256" cy="280" r="36"/>
    <path fill="${F.gold}" d="M256 260l12 24 28 4-20 20 4 28-24-12-24 12 4-28-20-20 28-4z"/>`;
}

function book() {
  return `
    <rect fill="${F.leather}" x="130" y="100" width="252" height="320" rx="12"/>
    <rect fill="${F.gold}" x="150" y="120" width="20" height="280" rx="4"/>
    <rect fill="${F.light}" x="190" y="140" width="160" height="40" rx="4"/>
    <path fill="none" d="M200 220h140M200 260h140M200 300h100"/>`;
}

function keyring({ modern = false }) {
  return `
    <circle fill="none" stroke="${STROKE}" stroke-width="16" cx="256" cy="180" r="70"/>
    <path fill="${modern ? F.plasticMid : F.iron}" d="M240 240v140c0 20 32 20 32 0V240"/>
    <circle fill="${modern ? F.orange : F.gold}" cx="256" cy="400" r="28"/>
    <path fill="${modern ? F.plastic : F.ironDark}" d="M200 250h40v20h-40zm72 30h40v20h-40z"/>`;
}

function coinPurse() {
  return `
    <path fill="${F.leather}" d="M170 180c0-40 172-40 172 0v160c0 60-40 100-86 100s-86-40-86-100z"/>
    <rect fill="${F.wood}" x="210" y="140" width="92" height="50" rx="8"/>
    <circle fill="${F.gold}" cx="230" cy="280" r="18"/>
    <circle fill="${F.gold}" cx="280" cy="300" r="18"/>`;
}

function gem() {
  return `
    <path fill="${F.cyan}" d="M256 80l120 120-120 200L136 200z"/>
    <path fill="${F.light}" d="M256 80l60 120H196z"/>
    <path fill="${F.teal}" d="M196 200h120L256 400z"/>`;
}

function blanket() {
  return `
    <rect fill="${F.red}" x="120" y="140" width="272" height="240" rx="16"/>
    <path fill="${F.gold}" d="M140 160h232v40H140zm0 80h232v40H140zm0 80h232v40H140z"/>`;
}

function tinderbox() {
  return `
    <rect fill="${F.wood}" x="150" y="160" width="212" height="200" rx="12"/>
    <rect fill="${F.ironDark}" x="180" y="200" width="60" height="100" rx="6"/>
    <path fill="${F.orange}" d="M280 220c30 20 40 60 20 90-20 10-40 0-50-20 10-30 20-50 30-70z"/>`;
}

function lute() {
  return `
    <ellipse fill="${F.wood}" cx="256" cy="300" rx="110" ry="130"/>
    <circle fill="${F.leather}" cx="256" cy="300" r="40"/>
    <rect fill="${F.wood}" x="244" y="80" width="24" height="160" rx="4"/>
    <rect fill="${F.ironDark}" x="220" y="70" width="72" height="40" rx="6"/>
    <path fill="none" d="M250 120v160M262 120v160"/>`;
}

function energyGun({ size = 'm' }) {
  const w = size === 's' ? 200 : size === 'l' ? 320 : 260;
  const h = size === 's' ? 80 : size === 'l' ? 100 : 90;
  const x = (512 - w) / 2;
  return `
    <rect fill="${F.panel}" x="${x}" y="200" width="${w}" height="${h}" rx="16"/>
    <rect fill="${F.cyan}" x="${x + w - 50}" y="220" width="36" height="${h - 40}" rx="6"/>
    <rect fill="${F.panelMid}" x="${x + 20}" y="290" width="50" height="90" rx="8"/>
    <circle fill="${F.teal}" cx="${x + 80}" cy="${200 + h / 2}" r="14"/>`;
}

function stunDevice() {
  return `
    <rect fill="${F.panel}" x="200" y="120" width="112" height="280" rx="24"/>
    <rect fill="${F.cyan}" x="220" y="150" width="72" height="40" rx="8"/>
    <path fill="${F.light}" d="M230 220h52v120H230z"/>
    <circle fill="${F.teal}" cx="256" cy="380" r="16"/>`;
}

function energyBlade() {
  return `
    <path fill="${F.cyan}" d="M256 50l18 30v260H238V80z"/>
    <rect fill="${F.panel}" x="220" y="340" width="72" height="90" rx="10"/>
    <rect fill="${F.teal}" x="236" y="350" width="40" height="20" rx="4"/>
    <circle fill="${F.panelMid}" cx="256" cy="450" r="22"/>`;
}

function suit({ heavy = false, tactical = false }) {
  const fill = heavy ? F.panel : tactical ? F.panelMid : F.light;
  const accent = F.cyan;
  return `
    <path fill="${fill}" d="M170 120h172l40 50v230H130V170z"/>
    <circle fill="${fill}" cx="256" cy="90" r="44"/>
    <rect fill="${accent}" x="220" y="200" width="72" height="24" rx="4"/>
    <path fill="none" d="M180 280h152M180 340h152"/>`;
}

function shieldEmitter() {
  return `
    <circle fill="${F.panel}" cx="256" cy="256" r="120"/>
    <circle fill="${F.cyan}" cx="256" cy="256" r="70"/>
    <circle fill="${F.panelMid}" cx="256" cy="256" r="30"/>
    <path fill="none" stroke="${F.teal}" stroke-width="10" d="M160 160l40 40M352 160l-40 40M160 352l40-40M352 352l-40-40"/>`;
}

function cellPack({ ammo = false }) {
  return `
    <rect fill="${F.panel}" x="180" y="140" width="152" height="240" rx="16"/>
    <rect fill="${ammo ? F.orange : F.cyan}" x="200" y="170" width="112" height="60" rx="8"/>
    <rect fill="${F.panelMid}" x="210" y="260" width="92" height="80" rx="8"/>
    <circle fill="${F.teal}" cx="256" cy="360" r="14"/>`;
}

function hypospray() {
  return `
    <rect fill="${F.light}" x="230" y="80" width="52" height="280" rx="12"/>
    <rect fill="${F.cyan}" x="240" y="120" width="32" height="120" rx="6"/>
    <rect fill="${F.panel}" x="210" y="340" width="92" height="70" rx="12"/>
    <circle fill="${F.teal}" cx="256" cy="100" r="18"/>`;
}

function vial({ fill }) {
  return `
    <rect fill="${F.panelMid}" x="220" y="70" width="72" height="40" rx="6"/>
    <rect fill="${F.light}" x="230" y="110" width="52" height="260" rx="10"/>
    <rect fill="${fill}" x="238" y="200" width="36" height="150" rx="6"/>`;
}

function scifiRation() {
  return `
    <rect fill="${F.panel}" x="140" y="160" width="232" height="200" rx="16"/>
    <rect fill="${F.teal}" x="160" y="180" width="192" height="60" rx="8"/>
    <path fill="none" d="M180 280h152M180 320h100"/>`;
}

function purifier() {
  return `
    <rect fill="${F.panel}" x="170" y="120" width="172" height="280" rx="20"/>
    <circle fill="${F.cyan}" cx="256" cy="220" r="50"/>
    <rect fill="${F.teal}" x="200" y="300" width="112" height="60" rx="10"/>`;
}

function communicator() {
  return `
    <rect fill="${F.panel}" x="200" y="100" width="112" height="300" rx="24"/>
    <rect fill="${F.cyan}" x="220" y="140" width="72" height="160" rx="8"/>
    <circle fill="${F.teal}" cx="256" cy="350" r="18"/>`;
}

function datapad() {
  return `
    <rect fill="${F.panel}" x="140" y="80" width="232" height="350" rx="20"/>
    <rect fill="${F.cyan}" x="160" y="110" width="192" height="240" rx="8"/>
    <rect fill="${F.panelMid}" x="180" y="370" width="152" height="30" rx="6"/>`;
}

function scanner({ multi = false }) {
  return `
    <rect fill="${F.panel}" x="180" y="140" width="152" height="240" rx="20"/>
    <circle fill="${F.cyan}" cx="256" cy="240" r="${multi ? 50 : 36}"/>
    <rect fill="${F.teal}" x="210" y="320" width="92" height="30" rx="6"/>
    ${multi ? `<path fill="none" d="M200 200h112M200 280h112"/>` : ''}`;
}

function navModule() {
  return `
    <rect fill="${F.panel}" x="150" y="150" width="212" height="212" rx="24"/>
    <circle fill="${F.cyan}" cx="256" cy="256" r="70"/>
    <path fill="${F.panelMid}" d="M256 200l20 56H236z"/>
    <circle fill="${F.teal}" cx="256" cy="256" r="12"/>`;
}

function kitBox({ accent = F.cyan }) {
  return `
    <rect fill="${F.panel}" x="130" y="150" width="252" height="220" rx="16"/>
    <rect fill="${accent}" x="150" y="170" width="212" height="50" rx="8"/>
    <rect fill="${F.panelMid}" x="170" y="240" width="60" height="90" rx="6"/>
    <rect fill="${F.panelMid}" x="250" y="240" width="60" height="90" rx="6"/>
    <rect fill="${F.light}" x="330" y="240" width="40" height="90" rx="6"/>`;
}

function sampleJar() {
  return `
    <rect fill="${F.panelMid}" x="200" y="80" width="112" height="40" rx="8"/>
    <rect fill="${F.light}" x="190" y="120" width="132" height="280" rx="16"/>
    <rect fill="${F.green}" x="210" y="280" width="92" height="90" rx="8"/>`;
}

function flashlight({ scifi = false }) {
  return `
    <rect fill="${scifi ? F.panel : F.plastic}" x="180" y="200" width="220" height="80" rx="16"/>
    <circle fill="${scifi ? F.cyan : F.gold}" cx="170" cy="240" r="40"/>
    <rect fill="${scifi ? F.teal : F.plasticMid}" x="360" y="210" width="50" height="60" rx="8"/>`;
}

function multitool() {
  return `
    <rect fill="${F.panel}" x="220" y="100" width="72" height="300" rx="16"/>
    <path fill="${F.iron}" d="M292 140h80l-20 40H292z"/>
    <path fill="${F.ironDark}" d="M220 200h-80l20 40h60z"/>
    <rect fill="${F.cyan}" x="236" y="320" width="40" height="50" rx="6"/>`;
}

function card({ accent = F.cyan }) {
  return `
    <rect fill="${F.panel}" x="120" y="170" width="272" height="172" rx="16"/>
    <rect fill="${accent}" x="140" y="190" width="120" height="40" rx="6"/>
    <rect fill="${F.light}" x="140" y="250" width="232" height="20" rx="4"/>
    <rect fill="${F.light}" x="140" y="290" width="160" height="20" rx="4"/>`;
}

function chip() {
  return `
    <rect fill="${F.panelMid}" x="160" y="160" width="192" height="192" rx="16"/>
    <rect fill="${F.cyan}" x="200" y="200" width="112" height="112" rx="8"/>
    <path fill="none" d="M160 220h-30M160 256h-30M160 292h-30M352 220h30M352 256h30M352 292h30"/>`;
}

function encryptedFile() {
  return `
    <rect fill="${F.panel}" x="150" y="100" width="212" height="300" rx="12"/>
    <rect fill="${F.cyan}" x="180" y="140" width="152" height="40" rx="6"/>
    <path fill="${F.teal}" d="M220 240h72v80H220zm20-30h32v30h-32z"/>
    <circle fill="${F.panelMid}" cx="256" cy="360" r="14"/>`;
}

function credits() {
  return `
    <circle fill="${F.gold}" cx="220" cy="240" r="90"/>
    <circle fill="${F.cyan}" cx="300" cy="280" r="90"/>
    <circle fill="${F.panelMid}" cx="256" cy="220" r="70"/>
    <path fill="none" d="M230 220h52M256 200v40"/>`;
}

function spacesuit() {
  return `
    <circle fill="${F.light}" cx="256" cy="100" r="50"/>
    <path fill="${F.light}" d="M170 160h172l36 40v200H134V200z"/>
    <rect fill="${F.cyan}" x="220" y="200" width="72" height="40" rx="8"/>
    <rect fill="${F.panel}" x="150" y="300" width="50" height="100" rx="10"/>
    <rect fill="${F.panel}" x="312" y="300" width="50" height="100" rx="10"/>`;
}

function breathGear() {
  return `
    <circle fill="${F.panel}" cx="256" cy="220" r="100"/>
    <circle fill="${F.cyan}" cx="256" cy="220" r="50"/>
    <rect fill="${F.panelMid}" x="200" y="320" width="112" height="100" rx="16"/>
    <path fill="none" d="M180 280c-40 40-40 100 0 120M332 280c40 40 40 100 0 120"/>`;
}

function beacon() {
  return `
    <rect fill="${F.panel}" x="220" y="220" width="72" height="200" rx="12"/>
    <circle fill="${F.cyan}" cx="256" cy="160" r="60"/>
    <circle fill="${F.teal}" cx="256" cy="160" r="28"/>
    <path fill="none" d="M180 120l40 40M332 120l-40 40M256 60v40"/>`;
}

function cable() {
  return `
    <path fill="none" stroke="${STROKE}" stroke-width="22" d="M120 160c80 0 80 80 160 80s80 80 160 80"/>
    <rect fill="${F.panel}" x="90" y="130" width="60" height="60" rx="10"/>
    <rect fill="${F.cyan}" x="360" y="290" width="60" height="60" rx="10"/>`;
}

function energyPack() {
  return `
    <rect fill="${F.panel}" x="150" y="120" width="212" height="280" rx="20"/>
    <rect fill="${F.cyan}" x="180" y="160" width="152" height="80" rx="10"/>
    <path fill="${F.teal}" d="M220 280h72v80H220z"/>
    <circle fill="${F.light}" cx="256" cy="360" r="12"/>`;
}

function phone() {
  return `
    <rect fill="${F.plastic}" x="180" y="70" width="152" height="370" rx="28"/>
    <rect fill="${F.blue}" x="198" y="110" width="116" height="260" rx="8"/>
    <circle fill="${F.plasticMid}" cx="256" cy="400" r="14"/>`;
}

function laptop() {
  return `
    <rect fill="${F.plastic}" x="110" y="120" width="292" height="200" rx="12"/>
    <rect fill="${F.blue}" x="130" y="140" width="252" height="160" rx="6"/>
    <path fill="${F.plasticMid}" d="M80 320h352l20 50H60z"/>`;
}

function tablet() {
  return `
    <rect fill="${F.plastic}" x="130" y="80" width="252" height="350" rx="24"/>
    <rect fill="${F.blue}" x="150" y="110" width="212" height="280" rx="8"/>
    <circle fill="${F.plasticMid}" cx="256" cy="410" r="12"/>`;
}

function headphones() {
  return `
    <path fill="none" stroke="${STROKE}" stroke-width="22" d="M140 260c0-100 232-100 232 0"/>
    <rect fill="${F.plastic}" x="110" y="240" width="60" height="120" rx="16"/>
    <rect fill="${F.plastic}" x="342" y="240" width="60" height="120" rx="16"/>
    <rect fill="${F.blue}" x="120" y="260" width="40" height="80" rx="8"/>
    <rect fill="${F.blue}" x="352" y="260" width="40" height="80" rx="8"/>`;
}

function charger() {
  return `
    <rect fill="${F.white}" x="200" y="80" width="112" height="160" rx="12"/>
    <rect fill="${F.plastic}" x="230" y="240" width="52" height="140" rx="8"/>
    <rect fill="${F.plasticMid}" x="210" y="380" width="92" height="40" rx="8"/>
    <path fill="none" d="M256 240v0"/>`;
}

function powerbank() {
  return `
    <rect fill="${F.plastic}" x="170" y="140" width="172" height="240" rx="24"/>
    <rect fill="${F.blue}" x="200" y="180" width="112" height="20" rx="4"/>
    <circle fill="${F.orange}" cx="256" cy="280" r="24"/>
    <rect fill="${F.plasticMid}" x="220" y="330" width="72" height="24" rx="6"/>`;
}

function wallet() {
  return `
    <rect fill="${F.brown}" x="110" y="160" width="292" height="200" rx="16"/>
    <rect fill="${F.leather}" x="130" y="180" width="252" height="160" rx="10"/>
    <rect fill="${F.gold}" x="300" y="230" width="50" height="40" rx="6"/>`;
}

function cash() {
  return `
    <rect fill="${F.green}" x="120" y="180" width="272" height="140" rx="12"/>
    <rect fill="${F.light}" x="140" y="200" width="232" height="100" rx="8"/>
    <circle fill="${F.green}" cx="256" cy="250" r="28"/>
    <rect fill="${F.green}" x="140" y="240" width="40" height="200" rx="8" transform="rotate(-15 160 340)"/>`;
}

function idCard({ accent = F.blue }) {
  return `
    <rect fill="${F.white}" x="100" y="160" width="312" height="200" rx="16"/>
    <rect fill="${accent}" x="120" y="180" width="100" height="120" rx="8"/>
    <rect fill="${F.plasticMid}" x="240" y="190" width="150" height="24" rx="4"/>
    <rect fill="${F.plasticMid}" x="240" y="230" width="120" height="16" rx="4"/>
    <rect fill="${F.plasticMid}" x="240" y="260" width="140" height="16" rx="4"/>`;
}

function handbag() {
  return `
    <path fill="${F.brown}" d="M140 200h232l20 180H120z"/>
    <path fill="none" stroke="${STROKE}" stroke-width="16" d="M180 200c0-70 152-70 152 0"/>
    <rect fill="${F.gold}" x="236" y="260" width="40" height="30" rx="6"/>`;
}

function shoppingBag() {
  return `
    <path fill="${F.orange}" d="M150 180h212l30 220H120z"/>
    <path fill="none" stroke="${STROKE}" stroke-width="14" d="M190 180v-40c0-40 132-40 132 0v40"/>
    <rect fill="${F.white}" x="200" y="240" width="112" height="80" rx="8"/>`;
}

function notebook() {
  return `
    <rect fill="${F.blue}" x="140" y="90" width="232" height="340" rx="12"/>
    <rect fill="${F.white}" x="170" y="120" width="180" height="280" rx="6"/>
    <path fill="none" d="M190 160h140M190 200h140M190 240h140M190 280h100"/>`;
}

function pen() {
  return `
    <rect fill="${F.blue}" x="230" y="60" width="52" height="320" rx="10"/>
    <path fill="${F.plastic}" d="M230 380h52l-26 60z"/>
    <rect fill="${F.gold}" x="230" y="300" width="52" height="30"/>
    <rect fill="${F.white}" x="242" y="80" width="28" height="80" rx="4"/>`;
}

function folder() {
  return `
    <path fill="${F.orange}" d="M100 150h140l30 30h140v220H100z"/>
    <rect fill="${F.white}" x="120" y="200" width="272" height="180" rx="8"/>`;
}

function contract() {
  return `
    <rect fill="${F.white}" x="130" y="80" width="252" height="350" rx="8"/>
    <path fill="none" d="M160 140h192M160 180h192M160 220h160M160 260h180"/>
    <path fill="${F.blue}" d="M180 340h80v40H180z"/>
    <path fill="${F.plasticMid}" d="M300 350c20-20 40-10 40 10"/>`;
}

function lighter() {
  return `
    <rect fill="${F.plastic}" x="200" y="160" width="112" height="240" rx="16"/>
    <rect fill="${F.plasticMid}" x="200" y="120" width="112" height="50" rx="10"/>
    <path fill="${F.orange}" d="M256 80c20 20 24 40 10 60h-20c-14-20-10-40 10-60z"/>`;
}

function umbrella() {
  return `
    <path fill="${F.blue}" d="M256 100c100 0 160 80 160 80H96s60-80 160-80z"/>
    <rect fill="${F.plastic}" x="244" y="180" width="24" height="240" rx="4"/>
    <path fill="none" d="M244 420c-30 0-40 30-20 40"/>`;
}

function bottle() {
  return `
    <rect fill="${F.plasticMid}" x="210" y="60" width="92" height="50" rx="8"/>
    <path fill="${F.blue}" d="M190 110h132v300c0 30-30 50-66 50s-66-20-66-50z"/>
    <rect fill="${F.white}" x="220" y="160" width="72" height="120" rx="8"/>`;
}

function coffee() {
  return `
    <path fill="${F.white}" d="M170 140h172l20 260H150z"/>
    <rect fill="${F.orange}" x="190" y="180" width="132" height="160" rx="8"/>
    <path fill="none" d="M342 200c40 0 40 80 0 100"/>
    <ellipse fill="${F.plasticMid}" cx="256" cy="140" rx="90" ry="24"/>`;
}

function groceries() {
  return `
    <rect fill="${F.orange}" x="150" y="160" width="212" height="240" rx="16"/>
    <circle fill="${F.red}" cx="220" cy="240" r="28"/>
    <circle fill="${F.green}" cx="300" cy="260" r="32"/>
    <rect fill="${F.gold}" x="200" y="320" width="112" height="40" rx="8"/>`;
}

function kitchenKnife() {
  return `
    <path fill="${F.iron}" d="M160 220h220l40 20-40 20H160z"/>
    <rect fill="${F.brown}" x="100" y="210" width="70" height="60" rx="10"/>
    <path fill="${F.ironMid}" d="M160 230h200v20H160z"/>`;
}

function meds() {
  return `
    <rect fill="${F.white}" x="160" y="140" width="192" height="240" rx="16"/>
    <rect fill="${F.blue}" x="180" y="160" width="152" height="50" rx="8"/>
    <circle fill="${F.red}" cx="220" cy="280" r="28"/>
    <circle fill="${F.green}" cx="300" cy="300" r="24"/>`;
}

function toolbox() {
  return `
    <rect fill="${F.orange}" x="110" y="180" width="292" height="200" rx="16"/>
    <rect fill="${F.plastic}" x="200" y="140" width="112" height="50" rx="10"/>
    <rect fill="${F.plasticMid}" x="140" y="220" width="80" height="50" rx="6"/>
    <rect fill="${F.plasticMid}" x="240" y="220" width="120" height="50" rx="6"/>`;
}

function ductTape() {
  return `
    <circle fill="${F.plasticMid}" cx="256" cy="256" r="130"/>
    <circle fill="${F.plastic}" cx="256" cy="256" r="70"/>
    <circle fill="${F.white}" cx="256" cy="256" r="30"/>
    <rect fill="${F.silver || F.iron}" x="256" y="120" width="140" height="36" rx="6"/>`;
}

function gloves() {
  return `
    <path fill="${F.brown}" d="M160 160h80v200c0 40-80 40-80 0zm40-40c20-40 60-40 80 0v40H200z"/>
    <path fill="${F.leather}" d="M280 160h80v200c0 40-80 40-80 0zm40-40c20-40 60-40 80 0v40H320z"/>`;
}

function workClothes() {
  return `
    <path fill="${F.blue}" d="M160 120h192l40 50v250H120V170z"/>
    <rect fill="${F.orange}" x="220" y="200" width="72" height="120" rx="8"/>
    <path fill="none" d="M200 160h112"/>`;
}

function helmet() {
  return `
    <path fill="${F.plastic}" d="M120 280c0-100 272-100 272 0v40H120z"/>
    <path fill="${F.white}" d="M140 280c10-70 222-70 232 0"/>
    <rect fill="${F.orange}" x="200" y="300" width="112" height="24" rx="6"/>`;
}

function ticket() {
  return `
    <rect fill="${F.white}" x="100" y="180" width="312" height="160" rx="12"/>
    <path fill="${F.blue}" d="M100 180h60v160H100z"/>
    <circle fill="${F.white}" cx="100" cy="260" r="16"/>
    <path fill="none" d="M190 220h180M190 260h140M190 300h160"/>`;
}

function carKeys() {
  return `
    <rect fill="${F.plastic}" x="180" y="120" width="152" height="200" rx="28"/>
    <circle fill="${F.orange}" cx="256" cy="180" r="24"/>
    <rect fill="${F.iron}" x="236" y="320" width="40" height="120" rx="6"/>
    <path fill="${F.ironDark}" d="M236 420h40v20c0 16-40 16-40 0z"/>`;
}

function soccerBall() {
  return `
    <circle fill="${F.white}" cx="256" cy="256" r="140"/>
    <path fill="${F.plastic}" d="M256 140l40 50-16 60h-48l-16-60z"/>
    <path fill="none" d="M180 220l76-30 76 30M180 300l76 40 76-40"/>`;
}

function whistle() {
  return `
    <rect fill="${F.plasticMid}" x="140" y="220" width="200" height="80" rx="20"/>
    <circle fill="${F.plastic}" cx="340" cy="260" r="50"/>
    <circle fill="${F.white}" cx="340" cy="260" r="20"/>
    <path fill="none" d="M140 200c-20-40 0-60 40-40"/>`;
}

function sportsBag() {
  return `
    <rect fill="${F.blue}" x="110" y="180" width="292" height="200" rx="24"/>
    <path fill="none" stroke="${STROKE}" stroke-width="14" d="M180 180c20-60 132-60 152 0"/>
    <rect fill="${F.white}" x="200" y="240" width="112" height="60" rx="8"/>`;
}

function guitar() {
  return `
    <ellipse fill="${F.wood}" cx="256" cy="320" rx="100" ry="120"/>
    <circle fill="${F.leather}" cx="256" cy="320" r="36"/>
    <rect fill="${F.wood}" x="244" y="60" width="24" height="200" rx="4"/>
    <rect fill="${F.plastic}" x="220" y="50" width="72" height="50" rx="6"/>
    <path fill="none" d="M250 100v200M262 100v200"/>`;
}

function boots() {
  return `
    <path fill="${F.brown}" d="M140 200h100v160H120c0-40 20-80 20-160z"/>
    <path fill="${F.leather}" d="M140 360h140l40 40H120z"/>
    <path fill="${F.brown}" d="M280 200h100v160h-80c0-40-20-80-20-160z"/>
    <path fill="${F.leather}" d="M280 360h140l20 40H260z"/>`;
}

/** slug → { label, body } */
const ICONS = {
  'builtin-fantasy-longsword': { label: 'Langschwert', body: sword({ bladeH: 284 }) },
  'builtin-fantasy-shortsword': { label: 'Kurzschwert', body: sword({ bladeH: 200, tipY: 80 }) },
  'builtin-fantasy-dagger': { label: 'Dolch', body: dagger() },
  'builtin-fantasy-battle-axe': { label: 'Streitaxt', body: axe() },
  'builtin-fantasy-warhammer': { label: 'Kriegshammer', body: hammer() },
  'builtin-fantasy-spear': { label: 'Speer', body: spear() },
  'builtin-fantasy-quarterstaff': { label: 'Kampfstab', body: staff() },
  'builtin-fantasy-shortbow': { label: 'Kurzbogen', body: bow({ tall: false }) },
  'builtin-fantasy-longbow': { label: 'Langbogen', body: bow({ tall: true }) },
  'builtin-fantasy-crossbow': { label: 'Armbrust', body: crossbow() },
  'builtin-fantasy-arrows': { label: 'Pfeile', body: arrows({ bolts: false }) },
  'builtin-fantasy-bolts': { label: 'Bolzen', body: arrows({ bolts: true }) },
  'builtin-fantasy-light-shield': { label: 'leichter Schild', body: shield() },
  'builtin-fantasy-leather-armor': { label: 'Lederharnisch', body: armor({ kind: 'leather' }) },
  'builtin-fantasy-chainmail': { label: 'Kettenhemd', body: armor({ kind: 'chain' }) },
  'builtin-fantasy-plate-armor': { label: 'Plattenrüstung', body: armor({ kind: 'plate' }) },
  'builtin-fantasy-healing-potion': { label: 'Heiltrank', body: potion({ fill: F.red }) },
  'builtin-fantasy-antidote': { label: 'Gegengift', body: potion({ fill: F.green }) },
  'builtin-fantasy-travel-rations': { label: 'Reiseproviant', body: rations() },
  'builtin-fantasy-waterskin': { label: 'Wasserschlauch', body: waterskin() },
  'builtin-fantasy-torch': { label: 'Fackel', body: torch() },
  'builtin-fantasy-lantern': { label: 'Laterne', body: lantern() },
  'builtin-fantasy-rope': { label: 'Seil', body: rope() },
  'builtin-fantasy-grappling-hook': { label: 'Enterhaken', body: grapplingHook() },
  'builtin-fantasy-backpack': { label: 'Rucksack', body: backpack({ modern: false }) },
  'builtin-fantasy-belt-pouch': { label: 'Gürteltasche', body: pouch() },
  'builtin-fantasy-lockpicks': { label: 'Dietrichset', body: lockpicks() },
  'builtin-fantasy-healer-kit': { label: 'Heilerset', body: tools({ medical: true }) },
  'builtin-fantasy-craftsman-tools': { label: 'Handwerkszeug', body: tools({ medical: false }) },
  'builtin-fantasy-map': { label: 'Karte', body: mapDoc() },
  'builtin-fantasy-compass': { label: 'Kompass', body: compass() },
  'builtin-fantasy-writing-kit': { label: 'Schreibzeug', body: writingKit() },
  'builtin-fantasy-sealed-letter': { label: 'versiegelter Brief', body: letter() },
  'builtin-fantasy-book': { label: 'Buch', body: book() },
  'builtin-fantasy-keyring': { label: 'Schlüsselbund', body: keyring({ modern: false }) },
  'builtin-fantasy-coin-purse': { label: 'Münzbeutel', body: coinPurse() },
  'builtin-fantasy-gemstone': { label: 'Edelstein', body: gem() },
  'builtin-fantasy-blanket': { label: 'Decke', body: blanket() },
  'builtin-fantasy-tinderbox': { label: 'Zunderzeug', body: tinderbox() },
  'builtin-fantasy-musical-instrument': { label: 'Musikinstrument', body: lute() },

  'builtin-scifi-compact-energy-weapon': { label: 'kompakte Energiewaffe', body: energyGun({ size: 's' }) },
  'builtin-scifi-standard-energy-weapon': { label: 'Standard-Energiewaffe', body: energyGun({ size: 'm' }) },
  'builtin-scifi-heavy-energy-rifle': { label: 'schweres Energiegewehr', body: energyGun({ size: 'l' }) },
  'builtin-scifi-stun-device': { label: 'Betäubungsgerät', body: stunDevice() },
  'builtin-scifi-energy-blade': { label: 'Energieklinge', body: energyBlade() },
  'builtin-scifi-light-protective-suit': { label: 'leichter Schutzanzug', body: suit({}) },
  'builtin-scifi-tactical-protective-suit': { label: 'taktischer Schutzanzug', body: suit({ tactical: true }) },
  'builtin-scifi-heavy-protective-suit': { label: 'schwerer Schutzanzug', body: suit({ heavy: true }) },
  'builtin-scifi-personal-shield-emitter': { label: 'persönlicher Schildemitter', body: shieldEmitter() },
  'builtin-scifi-energy-cell': { label: 'Energiezelle', body: cellPack({}) },
  'builtin-scifi-ammo-pack': { label: 'Munitionspack', body: cellPack({ ammo: true }) },
  'builtin-scifi-medkit': { label: 'Medkit', body: tools({ medical: true }) },
  'builtin-scifi-hypospray': { label: 'Hypospray', body: hypospray() },
  'builtin-scifi-antitoxin': { label: 'Antitoxin', body: vial({ fill: F.green }) },
  'builtin-scifi-emergency-ration': { label: 'Notration', body: scifiRation() },
  'builtin-scifi-water-purifier': { label: 'Wasseraufbereiter', body: purifier() },
  'builtin-scifi-communicator': { label: 'Kommunikator', body: communicator() },
  'builtin-scifi-datapad': { label: 'Datapad', body: datapad() },
  'builtin-scifi-hand-scanner': { label: 'Handscanner', body: scanner({}) },
  'builtin-scifi-multi-scanner': { label: 'Multiscanner', body: scanner({ multi: true }) },
  'builtin-scifi-navigation-module': { label: 'Navigationsmodul', body: navModule() },
  'builtin-scifi-engineering-kit': { label: 'Engineering-Kit', body: kitBox({ accent: F.orange }) },
  'builtin-scifi-precision-tools': { label: 'Präzisionswerkzeug', body: multitool() },
  'builtin-scifi-repair-material': { label: 'Reparaturmaterial', body: cellPack({ ammo: true }) },
  'builtin-scifi-research-kit': { label: 'Forschungskit', body: kitBox({ accent: F.cyan }) },
  'builtin-scifi-sample-container': { label: 'Probenbehälter', body: sampleJar() },
  'builtin-scifi-flashlight': { label: 'Taschenlampe', body: flashlight({ scifi: true }) },
  'builtin-scifi-multitool': { label: 'Multitool', body: multitool() },
  'builtin-scifi-access-card': { label: 'Zugangskarte', body: card({ accent: F.cyan }) },
  'builtin-scifi-identity-module': { label: 'Identitätsmodul', body: card({ accent: F.teal }) },
  'builtin-scifi-data-chip': { label: 'Datenchip', body: chip() },
  'builtin-scifi-encrypted-file': { label: 'verschlüsselte Datei', body: encryptedFile() },
  'builtin-scifi-credits': { label: 'Credits', body: credits() },
  'builtin-scifi-universal-backpack': { label: 'Universalrucksack', body: backpack({ modern: true }) },
  'builtin-scifi-equipment-bag': { label: 'Ausrüstungstasche', body: sportsBag() },
  'builtin-scifi-spacesuit': { label: 'Raumanzug', body: spacesuit() },
  'builtin-scifi-breathing-apparatus': { label: 'Atemgerät', body: breathGear() },
  'builtin-scifi-signal-beacon': { label: 'Signalgeber', body: beacon() },
  'builtin-scifi-cable-tether': { label: 'Kabel/Leine', body: cable() },
  'builtin-scifi-portable-energy-pack': { label: 'tragbarer Energiepack', body: energyPack() },

  'builtin-contemporary-smartphone': { label: 'Smartphone', body: phone() },
  'builtin-contemporary-laptop': { label: 'Laptop', body: laptop() },
  'builtin-contemporary-tablet': { label: 'Tablet', body: tablet() },
  'builtin-contemporary-headphones': { label: 'Kopfhörer', body: headphones() },
  'builtin-contemporary-charger': { label: 'Ladegerät', body: charger() },
  'builtin-contemporary-powerbank': { label: 'Powerbank', body: powerbank() },
  'builtin-contemporary-wallet': { label: 'Geldbörse', body: wallet() },
  'builtin-contemporary-cash': { label: 'Bargeld', body: cash() },
  'builtin-contemporary-bank-card': { label: 'Bankkarte', body: idCard({ accent: F.blue }) },
  'builtin-contemporary-id-card': { label: 'Personalausweis', body: idCard({ accent: F.plasticMid }) },
  'builtin-contemporary-drivers-license': { label: 'Führerschein', body: idCard({ accent: F.pink || F.orange }) },
  'builtin-contemporary-keyring': { label: 'Schlüsselbund', body: keyring({ modern: true }) },
  'builtin-contemporary-key-card': { label: 'Schlüsselkarte', body: card({ accent: F.orange }) },
  'builtin-contemporary-backpack': { label: 'Rucksack', body: backpack({ modern: true }) },
  'builtin-contemporary-handbag': { label: 'Handtasche', body: handbag() },
  'builtin-contemporary-shopping-bag': { label: 'Einkaufstasche', body: shoppingBag() },
  'builtin-contemporary-notebook': { label: 'Notizbuch', body: notebook() },
  'builtin-contemporary-ballpoint-pen': { label: 'Kugelschreiber', body: pen() },
  'builtin-contemporary-document-folder': { label: 'Dokumentenmappe', body: folder() },
  'builtin-contemporary-contract': { label: 'Vertrag', body: contract() },
  'builtin-contemporary-flashlight': { label: 'Taschenlampe', body: flashlight({ scifi: false }) },
  'builtin-contemporary-lighter': { label: 'Feuerzeug', body: lighter() },
  'builtin-contemporary-umbrella': { label: 'Regenschirm', body: umbrella() },
  'builtin-contemporary-water-bottle': { label: 'Wasserflasche', body: bottle() },
  'builtin-contemporary-coffee-cup': { label: 'Kaffeebecher', body: coffee() },
  'builtin-contemporary-groceries': { label: 'Lebensmittel', body: groceries() },
  'builtin-contemporary-kitchen-knife': { label: 'Küchenmesser', body: kitchenKnife() },
  'builtin-contemporary-first-aid-kit': { label: 'Erste-Hilfe-Set', body: tools({ medical: true }) },
  'builtin-contemporary-medication': { label: 'Medikamente', body: meds() },
  'builtin-contemporary-toolbox': { label: 'Werkzeugkoffer', body: toolbox() },
  'builtin-contemporary-duct-tape': { label: 'Klebeband', body: ductTape() },
  'builtin-contemporary-work-gloves': { label: 'Arbeitshandschuhe', body: gloves() },
  'builtin-contemporary-work-clothes': { label: 'Arbeitskleidung', body: workClothes() },
  'builtin-contemporary-bike-helmet': { label: 'Fahrradhelm', body: helmet() },
  'builtin-contemporary-transit-ticket': { label: 'Fahrkarte', body: ticket() },
  'builtin-contemporary-car-keys': { label: 'Autoschlüssel', body: carKeys() },
  'builtin-contemporary-soccer-ball': { label: 'Fußball', body: soccerBall() },
  'builtin-contemporary-whistle': { label: 'Trillerpfeife', body: whistle() },
  'builtin-contemporary-sports-bag': { label: 'Sporttasche', body: sportsBag() },
  'builtin-contemporary-guitar': { label: 'Gitarre', body: guitar() },

  'core-misc-footwear': { label: 'Schuhe / Fußschutz', body: boots() },
};

mkdirSync(outDir, { recursive: true });

let written = 0;
for (const [slug, { label, body }] of Object.entries(ICONS)) {
  writeFileSync(join(outDir, `${slug}.svg`), svg(label, body), 'utf8');
  written += 1;
}

console.log(`Wrote ${written} SVGs to ${outDir}`);
if (written !== 121) {
  console.error(`Expected 121 icons, got ${written}`);
  process.exit(1);
}
