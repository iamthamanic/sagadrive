import type { CharacterLoreContext } from './types';

const attributeLabels: Record<keyof CharacterLoreContext['attributes'], string> = {
  strength: 'körperliche Stärke',
  dexterity: 'Geschicklichkeit',
  constitution: 'Zähigkeit',
  intelligence: 'Wissen',
  wisdom: 'Intuition',
  charisma: 'Ausstrahlung',
};

function getDominantAttribute(context: CharacterLoreContext): string {
  const entries = Object.entries(context.attributes) as Array<[
    keyof CharacterLoreContext['attributes'],
    number,
  ]>;
  const [attribute] = entries.reduce((best, current) => (current[1] > best[1] ? current : best));
  return attributeLabels[attribute];
}

function joinTrait(values: string[], fallback: string): string {
  return values[0]?.trim() || fallback;
}

function getWorldFrame(context: CharacterLoreContext): string {
  if (context.ruleset === 'dnd-5.5e') {
    return 'einer namenlosen Fantasywelt voller Magie, alter Reiche und gefährlicher Wege';
  }

  return context.setting?.trim()
    ? `einem ${context.setting.trim()} geprägten SagaDrive-Setting`
    : 'einer offenen SagaDrive-Welt';
}

export function buildCharacterBackgroundExamples(context: CharacterLoreContext): string[] {
  const name = context.name.trim() || 'Der Charakter';
  const role = context.characterClass.trim() || (context.ruleset === 'dnd-5.5e' ? 'Abenteurer' : 'ungebundener Archetyp');
  const origin = context.raceOrSpecies.trim() || 'unbekannter Herkunft';
  const background = context.dndBackground?.trim();
  const essence = context.essenceProfile?.trim();
  const worldFrame = getWorldFrame(context);
  const dominantAttribute = getDominantAttribute(context);
  const personality = joinTrait(context.traits.personality, 'ruhiger Beobachtungsgabe');
  const ideal = joinTrait(context.traits.ideals, 'dem Wunsch, selbst über den eigenen Weg zu bestimmen');
  const bond = joinTrait(context.traits.bonds, 'einer Person, die niemals zurückgelassen werden darf');
  const flaw = joinTrait(context.traits.flaws, 'der Neigung, Risiken zu spät ernst zu nehmen');
  const ability = context.abilities[0]?.name || 'Eine ungewöhnliche Begabung';
  const item = context.inventory[0]?.name || 'Ein Erinnerungsstück aus der Vergangenheit';
  const backgroundFrame = background
    ? `Der frühere Hintergrund als ${background} prägt noch heute Gewohnheiten und Verpflichtungen.`
    : 'Die eigene Herkunft prägt noch heute Gewohnheiten und Verpflichtungen.';
  const essenceFrame = essence
    ? `Das Essenzprofil ${essence} wurde zu einem entscheidenden Teil des eigenen Weges.`
    : 'Eine noch ungeklärte innere Triebkraft wurde zu einem entscheidenden Teil des eigenen Weges.';

  return [
    `${name} wuchs als ${origin} in ${worldFrame} auf. Schon früh zeigte sich, dass ${role} weniger eine Berufung als eine Antwort auf die Umstände werden würde.`,
    `Ein einzelnes Ereignis veränderte alles. ${name} verbindet die eigene Geschichte seitdem mit ${ideal} und der Frage, wie weit man dafür gehen darf.`,
    `${name} lernte früh, sich auf ${dominantAttribute} zu verlassen. Was zunächst nur beim Überleben half, wurde später zum entscheidenden Vorteil auf dem Weg als ${role}.`,
    `${backgroundFrame} Für ${name} betrifft eine davon ${bond}.`,
    `Nach außen wirkt ${name} geprägt von ${personality}. Hinter dieser Haltung verbirgt sich jedoch ${flaw}, was in schwierigen Situationen immer wieder Entscheidungen beeinflusst.`,
    `${ability} war nicht einfach etwas, das ${name} erlernte. Die Fähigkeit entstand aus einer Erfahrung, die bis heute erklärt, warum Gefahr und Verantwortung so eng miteinander verbunden sind.`,
    `${item} gehört zu den wenigen Dingen, die ${name} aus einem früheren Lebensabschnitt behalten hat. Der eigentliche Wert liegt nicht im Gegenstand selbst, sondern in der Erinnerung, die daran hängt.`,
    `${name} folgt ${ideal}, obwohl dieser Grundsatz regelmäßig mit persönlichen Bindungen kollidiert. Besonders ${bond} macht einfache Entscheidungen fast unmöglich.`,
    `${essenceFrame} In ${worldFrame} ist seitdem unklar, ob diese Kraft Werkzeug, Verantwortung oder langfristig sogar Gefahr für ${name} ist.`,
    `${name} trägt einen ungeklärten Teil der eigenen Vergangenheit mit sich. Eine Person, ein Ort oder ein Versprechen aus früheren Tagen könnte jederzeit wieder auftauchen und die aktuelle Reise in eine neue Richtung zwingen.`,
  ];
}
