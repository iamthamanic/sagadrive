import { Check, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  getSagaDriveBackgroundTemplate,
  getSagaDriveBackgroundTemplatesForWorldProfile,
  type SagaDriveBackgroundTemplate,
} from '../../rulesets/backgroundTemplates';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  isSagaDriveSkillKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import { RuleHelp } from './RuleHelp';
import { SkillSelectField } from './SkillSelectField';

type SkillSlot = SagaDriveSkillKey | '';

interface CharacterBackgroundPanelProps {
  backgroundTemplateId: string | null | undefined;
  worldProfileId?: string | null;
  backgroundName: string;
  skillPool: readonly SkillSlot[];
  training: readonly SkillSlot[];
  specializationSkill: SkillSlot;
  specializationName: string;
  milieuAccess: string;
  contact: string;
  complication: string;
  communication: string;
  validationAttempted: boolean;
  complete: boolean;
  onTemplateSelect: (templateId: string | null) => void;
  onBackgroundNameChange: (value: string) => void;
  onPoolSkillChange: (index: number, value: string) => void;
  onTrainingToggle: (skill: SagaDriveSkillKey) => void;
  onSpecializationSkillChange: (skill: SkillSlot) => void;
  onSpecializationNameChange: (value: string) => void;
  onMilieuAccessChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onComplicationChange: (value: string) => void;
  onCommunicationChange: (value: string) => void;
}

function SuggestionButtons({ values, onSelect }: { values: readonly string[] | undefined; onSelect: (value: string) => void }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {values.slice(0, 3).map((value) => (
        <Button key={value} type="button" size="sm" variant="outline" className="min-h-11 px-2 text-xs" onClick={() => onSelect(value)}>
          {value}
        </Button>
      ))}
    </div>
  );
}

function TemplateCard({ template, selected, onSelect }: { template: SagaDriveBackgroundTemplate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-44 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/20'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{template.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{template.description}</p>
        </div>
        {selected ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : null}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{template.playstyle}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {template.skillPool.map((skill) => <Badge key={skill} variant="outline">{getSagaDriveSkill(skill).label}</Badge>)}
      </div>
    </button>
  );
}

interface BackgroundSkillNodeProps {
  skillKey: SagaDriveSkillKey;
  selected: boolean;
  recommended: boolean;
  disabled: boolean;
  specializationName?: string;
  onToggle: () => void;
}

function BackgroundSkillNode({
  skillKey,
  selected,
  recommended,
  disabled,
  specializationName,
  onToggle,
}: BackgroundSkillNodeProps) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);
  const hasSpecialization = Boolean(selected && specializationName?.trim());

  return (
    <div className="relative min-w-0 pt-4 sm:pt-5">
      <span className="absolute left-1/2 top-0 h-4 -translate-x-1/2 border-l border-border sm:h-5" aria-hidden="true" />
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-pressed={selected}
        className={`min-h-28 w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/20'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{skill.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Standard: {attribute.shortLabel}</p>
          </div>
          {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
          {recommended ? <Badge variant="secondary">Empfohlen</Badge> : null}
          {selected ? <Badge variant="outline">Hintergrund +1</Badge> : <Badge variant="outline">Pool</Badge>}
        </div>
      </button>

      {hasSpecialization ? (
        <div className="relative mx-auto mt-0 max-w-[12rem] pt-5 text-center">
          <span className="absolute left-1/2 top-0 h-5 -translate-x-1/2 border-l border-primary/60" aria-hidden="true" />
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spezialisierung</p>
            <p className="mt-0.5 text-sm font-medium">{specializationName}</p>
            <Badge className="mt-1.5">+2 auf passende Checks</Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CharacterBackgroundPanel({
  backgroundTemplateId,
  worldProfileId,
  backgroundName,
  skillPool,
  training,
  specializationSkill,
  specializationName,
  milieuAccess,
  contact,
  complication,
  communication,
  validationAttempted,
  complete,
  onTemplateSelect,
  onBackgroundNameChange,
  onPoolSkillChange,
  onTrainingToggle,
  onSpecializationSkillChange,
  onSpecializationNameChange,
  onMilieuAccessChange,
  onContactChange,
  onComplicationChange,
  onCommunicationChange,
}: CharacterBackgroundPanelProps) {
  const templates = getSagaDriveBackgroundTemplatesForWorldProfile(worldProfileId);
  const selectedTemplate = getSagaDriveBackgroundTemplate(backgroundTemplateId);
  const poolSkills = skillPool.filter(isSagaDriveSkillKey);
  const trainedSkills = training.filter(isSagaDriveSkillKey);
  const trainingSet = new Set(trainedSkills);
  const recommendationSet = new Set(selectedTemplate?.recommendedTraining ?? []);
  const allSkillKeys = getAllSkillKeys();
  const customMode = backgroundTemplateId === null;
  const hasChoice = backgroundTemplateId !== undefined;
  const specializationSuggestions = selectedTemplate?.specializationSuggestions.filter((entry) => trainedSkills.includes(entry.skillId)) ?? [];
  const backgroundLabel = selectedTemplate?.name ?? backgroundName.trim() || 'Eigener Hintergrund';

  return (
    <section className="space-y-5" aria-labelledby="background-competency-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h3 id="background-competency-heading" className="font-semibold">Hintergrund</h3>
            <RuleHelp label="Hintergrund">
              Dein Hintergrund erklärt, welche vier Fertigkeiten zu deiner Vergangenheit passen. Zwei davon erhalten je +1. Attribute werden dadurch nicht erhöht.
            </RuleHelp>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Wähle eine Vergangenheit. Danach bearbeitest du Pool, Training und Spezialisierung direkt an denselben Fertigkeits-Nodes.</p>
        </div>
        <Badge variant={complete ? 'default' : 'outline'}>{complete ? 'Hintergrund vollständig' : 'Hintergrund offen'}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} selected={backgroundTemplateId === template.id} onSelect={() => onTemplateSelect(template.id)} />
        ))}
        <button
          type="button"
          onClick={() => onTemplateSelect(null)}
          aria-pressed={customMode}
          className={`min-h-44 rounded-lg border border-dashed p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${customMode ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-primary/50 hover:bg-muted/20'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Eigenen Hintergrund erstellen</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Wähle selbst vier passende Fertigkeiten. Training und Spezialisierung folgen denselben Regeln wie bei einem Template.</p>
            </div>
            {customMode ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </div>
          <div className="mt-4"><Badge variant="secondary">Volle Freiheit · gleiche Regeln</Badge></div>
        </button>
      </div>

      {!hasChoice ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          Wähle zuerst ein Template oder „Eigenen Hintergrund erstellen“. Danach siehst du einmalig deine vier Pool-Fertigkeiten und trainierst zwei davon direkt im Graphen.
        </div>
      ) : (
        <div className="space-y-5 rounded-lg border border-border bg-muted/5 p-4 sm:p-5">
          {customMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background-name">Name des Hintergrunds</Label>
                <Input id="background-name" value={backgroundName} onChange={(event) => onBackgroundNameChange(event.target.value)} placeholder="z. B. Feldheiler, Kurierin, Hofgelehrter" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Vier Pool-Fertigkeiten festlegen</p>
                    <p className="text-sm text-muted-foreground">Diese Auswahl definiert deinen Kompetenzrahmen. Training folgt direkt darunter.</p>
                  </div>
                  <Badge variant={poolSkills.length === 4 ? 'default' : 'outline'}>{poolSkills.length} / 4</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skillPool.map((skill, index) => (
                    <SkillSelectField
                      key={index}
                      value={skill}
                      onValueChange={(value) => onPoolSkillChange(index, value)}
                      skillOptions={allSkillKeys}
                      disabledSkillKeys={skillPool.filter((current, currentIndex): current is SagaDriveSkillKey => currentIndex !== index && isSagaDriveSkillKey(current))}
                      placeholder={`Fertigkeit ${index + 1}`}
                      ariaLabel={`Hintergrund-Fertigkeit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Hintergrund</p>
            <div className="mx-auto max-w-sm rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="font-semibold">{backgroundLabel}</p>
              {selectedTemplate ? <p className="mt-1 text-xs text-muted-foreground">{selectedTemplate.playstyle}</p> : null}
            </div>
          </div>

          {poolSkills.length === 4 ? (
            <>
              <div className="relative hidden h-8 sm:block" aria-hidden="true">
                <span className="absolute left-1/2 top-0 h-4 -translate-x-1/2 border-l border-border" />
                <span className="absolute left-[12.5%] right-[12.5%] top-4 border-t border-border" />
              </div>

              <div className="relative sm:-mt-8">
                <div className="absolute bottom-0 left-3 top-0 border-l border-border sm:hidden" aria-hidden="true" />
                <div className="grid gap-3 pl-7 sm:grid-cols-2 sm:pl-0 xl:grid-cols-4">
                  {poolSkills.map((skillKey) => (
                    <BackgroundSkillNode
                      key={skillKey}
                      skillKey={skillKey}
                      selected={trainingSet.has(skillKey)}
                      recommended={recommendationSet.has(skillKey)}
                      disabled={!trainingSet.has(skillKey) && trainedSkills.length >= 2}
                      specializationName={specializationSkill === skillKey ? specializationName : undefined}
                      onToggle={() => onTrainingToggle(skillKey)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Training · 2 wählen</p>
                  <p className="text-sm text-muted-foreground">Klicke direkt auf zwei der vier Nodes. Beide erhalten <strong>Hintergrund +1</strong>.</p>
                </div>
                <Badge variant={trainedSkills.length === 2 ? 'default' : 'outline'}>{trainedSkills.length} / 2</Badge>
              </div>

              {trainedSkills.length === 2 ? (
                <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium">Spezialisierung</p>
                      <RuleHelp label="Spezialisierung">Eine passende Spezialisierung gibt +2 auf anwendbare Checks. Die erste Spezialisierung benötigt Fertigkeitswert 1.</RuleHelp>
                    </div>
                    <p className="text-sm text-muted-foreground">Wähle ein Fachgebiet auf einem deiner beiden trainierten Nodes. Nach der Wahl erscheint es direkt als untergeordneter Branch am Skill.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkillSelectField
                      value={specializationSkill}
                      onValueChange={(value) => onSpecializationSkillChange(isSagaDriveSkillKey(value) ? value : '')}
                      skillOptions={trainedSkills}
                      placeholder="Trainierte Fertigkeit wählen"
                      ariaLabel="Spezialisierung Fertigkeit wählen"
                    />
                    <Input value={specializationName} onChange={(event) => onSpecializationNameChange(event.target.value)} placeholder="Fachgebiet, z. B. Notfallmedizin" aria-label="Spezialisierung Fachgebiet" />
                  </div>
                  {specializationSuggestions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Vorschläge:</span>
                      {specializationSuggestions.map((entry) => (
                        <Button key={`${entry.skillId}-${entry.name}`} type="button" size="sm" variant="outline" className="min-h-11 px-2 text-xs" onClick={() => { onSpecializationSkillChange(entry.skillId); onSpecializationNameChange(entry.name); }}>
                          {getSagaDriveSkill(entry.skillId).label}: {entry.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  Wähle zuerst zwei Trainings. Danach wird die Spezialisierung freigeschaltet.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
              Vervollständige zuerst alle vier Pool-Fertigkeiten. Danach werden sie als zusammenhängende Trainings-Nodes angezeigt.
            </div>
          )}
        </div>
      )}

      {hasChoice ? (
        <div className="rounded-lg border border-border bg-muted/10 p-4">
          <div className="mb-4">
            <p className="font-medium">Verankerung in der Welt</p>
            <p className="mt-1 text-sm text-muted-foreground">Milieu, Kontakt, Komplikation und Kommunikation gehören zu deiner Vergangenheit, aber nicht in den mechanischen Skill-Graphen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="milieu">Milieuzugang</Label><Input id="milieu" value={milieuAccess} onChange={(event) => onMilieuAccessChange(event.target.value)} placeholder="z. B. Notaufnahmen, Unterwelt, Akademien" /><SuggestionButtons values={selectedTemplate?.milieuSuggestions} onSelect={onMilieuAccessChange} /></div>
            <div className="space-y-2"><Label htmlFor="contact">Kontakt</Label><Input id="contact" value={contact} onChange={(event) => onContactChange(event.target.value)} placeholder="Wer kann dir helfen?" /><SuggestionButtons values={selectedTemplate?.contactSuggestions} onSelect={onContactChange} /></div>
            <div className="space-y-2"><Label htmlFor="complication">Komplikation</Label><Input id="complication" value={complication} onChange={(event) => onComplicationChange(event.target.value)} placeholder="z. B. alte Schulden, gesuchte Identität" /><SuggestionButtons values={selectedTemplate?.complicationSuggestions} onSelect={onComplicationChange} /></div>
            <div className="space-y-2"><Label htmlFor="communication">Zusätzliche Kommunikationsform</Label><Input id="communication" value={communication} onChange={(event) => onCommunicationChange(event.target.value)} placeholder="z. B. Gebärdensprache, Funkcodes" /><SuggestionButtons values={selectedTemplate?.communicationSuggestions} onSelect={onCommunicationChange} /></div>
          </div>
        </div>
      ) : null}

      <div className={`rounded-lg border px-4 py-3 text-sm ${complete ? 'border-primary/30 bg-primary/5' : validationAttempted ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-border bg-muted/10'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{complete ? 'Hintergrund ist regelkonform vollständig.' : 'Noch offen: Template/Name, 4 Pool-Skills, 2 Trainings, 1 Spezialisierung sowie Milieu, Kontakt, Komplikation und Kommunikationsform.'}</p>
          <span className="text-xs">{poolSkills.length}/4 Pool · {trainedSkills.length}/2 Training · {specializationSkill && specializationName.trim() ? '1/1 Spezialisierung' : '0/1 Spezialisierung'}</span>
        </div>
      </div>
    </section>
  );
}

function getAllSkillKeys(): SagaDriveSkillKey[] {
  return [
    'athletics', 'acrobatics', 'sleight', 'stealth', 'melee', 'ranged', 'awareness', 'insight', 'survival',
    'investigation', 'knowledge', 'technology', 'medicine', 'driving', 'persuasion', 'deception', 'intimidation', 'performance',
  ];
}
