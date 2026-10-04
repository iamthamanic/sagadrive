/**
 * startingTemplateSketches — role portrait thumbnails for SagaDrive starttemplates.
 * Style: soft watercolor head-and-shoulders portraits (man + woman), role-readable
 * costume cues, indigo wash ground; species-neutral (no fixed race).
 * Location: src/app/character/creation/startingTemplateSketches.ts
 */
import type { SagaDriveStartingTemplateKey } from '../../../domains/rules/sagadrive/starting-templates';
import assassinSketch from '../../../assets/starting-templates/assassin.png';
import berserkerSketch from '../../../assets/starting-templates/berserker.png';
import heraldSketch from '../../../assets/starting-templates/herald.png';
import mageSketch from '../../../assets/starting-templates/mage.png';
import mechanomSketch from '../../../assets/starting-templates/mechanom.png';
import medicusSketch from '../../../assets/starting-templates/medicus.png';
import mentalistSketch from '../../../assets/starting-templates/mentalist.png';
import mysticSketch from '../../../assets/starting-templates/mystic.png';
import technomancerSketch from '../../../assets/starting-templates/technomancer.png';
import vanguardSketch from '../../../assets/starting-templates/vanguard.png';

export const startingTemplateSketchSources: Record<SagaDriveStartingTemplateKey, string> = {
  berserker: berserkerSketch,
  vanguard: vanguardSketch,
  mage: mageSketch,
  technomancer: technomancerSketch,
  medicus: medicusSketch,
  mystic: mysticSketch,
  assassin: assassinSketch,
  mechanom: mechanomSketch,
  mentalist: mentalistSketch,
  herald: heraldSketch,
};

export function getStartingTemplateSketchUrl(key: SagaDriveStartingTemplateKey): string {
  return startingTemplateSketchSources[key];
}
