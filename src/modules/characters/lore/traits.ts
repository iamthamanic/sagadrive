import type { CharacterLoreContext, CharacterTraitCategory } from './types';

const commonSuggestions: Record<CharacterTraitCategory, readonly string[]> = {
  personality: [
    'Ruhig und beobachtend',
    'Direkt und kompromisslos',
    'Neugierig auf das Unbekannte',
    'Loyal gegenüber der eigenen Gruppe',
    'Misstrauisch gegenüber Autoritäten',
    'Humor als Schutzmechanismus',
  ],
  ideals: [
    'Freiheit vor Sicherheit',
    'Wissen soll geteilt werden',
    'Verantwortung für die eigene Macht',
    'Niemand wird zurückgelassen',
    'Loyalität muss verdient werden',
    'Gerechtigkeit ist wichtiger als Regeln',
  ],
  bonds: [
    'Schützt eine Person aus der Vergangenheit',
    'Ist einer alten Schuld verpflichtet',
    'Bewahrt ein wichtiges Familienerbe',
    'Will einen verlorenen Ort wiederfinden',
    'Hat einem Mentor ein Versprechen gegeben',
    'Fühlt sich der eigenen Gruppe verantwortlich',
  ],
  flaws: [
    'Unterschätzt Risiken aus Neugier',
    'Kann nur schwer um Hilfe bitten',
    'Reagiert empfindlich auf Kontrollverlust',
    'Hält zu lange an alten Versprechen fest',
    'Vertraut den falschen Menschen zu schnell',
    'Kann eine Niederlage nur schwer akzeptieren',
  ],
};

const sagaDriveSuggestions: Record<CharacterTraitCategory, readonly string[]> = {
  personality: [
    'Passt sich schnell an neue Welten an',
    'Sucht Lösungen außerhalb fester Rollen',
    'Hinterfragt die Regeln des eigenen Settings',
  ],
  ideals: [
    'Die eigene Essenz bestimmt nicht das Schicksal',
    'Welten verändern sich durch Entscheidungen',
    'Macht braucht einen selbst gewählten Zweck',
  ],
  bonds: [
    'Ist an eine Figur aus dem eigenen Setting gebunden',
    'Schützt etwas, das mit der eigenen Essenz verbunden ist',
    'Trägt Verantwortung für einen früheren Wendepunkt',
  ],
  flaws: [
    'Verlässt sich zu stark auf die eigene Essenz',
    'Verwechselt Anpassungsfähigkeit mit Bindungslosigkeit',
    'Ignoriert Grenzen, wenn das Ziel wichtig genug erscheint',
  ],
};

const dnd55Suggestions: Record<CharacterTraitCategory, readonly string[]> = {
  personality: [
    'Behandelt Abenteuer wie eine ernste Verpflichtung',
    'Sammelt Geschichten über fremde Orte und Kreaturen',
    'Vertraut auf die Ausbildung der eigenen Klasse',
  ],
  ideals: [
    'Macht verpflichtet zum Schutz anderer',
    'Tradition darf hinterfragt werden',
    'Jeder Mensch verdient eine zweite Chance',
  ],
  bonds: [
    'Ist eng mit der eigenen Herkunft verbunden',
    'Verdankt einer früheren Gemeinschaft das eigene Leben',
    'Sucht nach einer Person aus dem früheren Hintergrund',
  ],
  flaws: [
    'Überschätzt die Möglichkeiten der eigenen Klasse',
    'Lässt sich von alten Feindschaften provozieren',
    'Folgt einem persönlichen Kodex auch dann, wenn er schadet',
  ],
};

function getContextualSuggestion(
  category: CharacterTraitCategory,
  context: CharacterLoreContext,
): string | undefined {
  if (context.ruleset === 'dnd-5.5e') {
    const background = context.dndBackground?.trim();
    const characterClass = context.characterClass.trim();
    if (category === 'bonds' && background) return `Fühlt sich dem Hintergrund ${background} weiterhin verpflichtet`;
    if (category === 'personality' && characterClass) return `Zeigt deutlich die Prägung der Klasse ${characterClass}`;
    return undefined;
  }

  const essence = context.essenceProfile?.trim();
  const setting = context.setting?.trim();
  if (category === 'ideals' && essence) return `Will die eigene Essenz ${essence} bewusst kontrollieren`;
  if (category === 'bonds' && setting) return `Ist tief mit dem Setting ${setting} verbunden`;
  return undefined;
}

export function getCharacterTraitSuggestions(
  category: CharacterTraitCategory,
  context: CharacterLoreContext,
): string[] {
  const rulesetSuggestions = context.ruleset === 'dnd-5.5e'
    ? dnd55Suggestions[category]
    : sagaDriveSuggestions[category];
  const contextualSuggestion = getContextualSuggestion(category, context);
  return Array.from(
    new Set([
      ...(contextualSuggestion ? [contextualSuggestion] : []),
      ...rulesetSuggestions,
      ...commonSuggestions[category],
    ]),
  );
}
