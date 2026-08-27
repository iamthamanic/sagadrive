/**
 * speciesSketches — Meshy-generated minimal fashion-sketch line-art per SagaDrive Spezies.
 * Style: #94A3B8 (muted-foreground) ink lines on transparent background, simple universal clothing.
 * Location: src/modules/characters/components/speciesSketches.ts
 */
import alienSketch from '../../../assets/species/alien.png';
import cyborgSketch from '../../../assets/species/cyborg.png';
import dwarfSketch from '../../../assets/species/dwarf.png';
import elfSketch from '../../../assets/species/elf.png';
import halflingSketch from '../../../assets/species/halfling.png';
import humanSketch from '../../../assets/species/human.png';
import orcSketch from '../../../assets/species/orc.png';

export const speciesSketchSources: Record<string, string> = {
  human: humanSketch,
  elf: elfSketch,
  dwarf: dwarfSketch,
  halfling: halflingSketch,
  orc: orcSketch,
  cyborg: cyborgSketch,
  alien: alienSketch,
};

export function getSpeciesSketchUrl(race: string): string {
  return speciesSketchSources[race.trim().toLowerCase()] ?? humanSketch;
}
