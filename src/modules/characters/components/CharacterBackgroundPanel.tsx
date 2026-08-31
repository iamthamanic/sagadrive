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
        <Button key={value} type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onSelect(value)}>
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
          <p className="mt-1 text-sm text-muted-foreground">Wähle eine passende Vergangenheit als Vorlage oder baue deinen Hintergrund frei.</p>
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
          Wähle zuerst ein Template oder „Eigenen Hintergrund erstellen“. Danach führt dich SagaDrive durch 4 Fertigkeiten → 2 Trainings → 1 Spezialisierung.
        </div>
      ) : (
        <div className="space-y-0">
          <div className="relative border-l border-border pb-6 pl-7">
            <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-background text-xs font-semibold text-primary">1</span>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Hintergrund & Fertigkeitspool</p>
                <p className="text-sm text-muted-foreground">Vier Fertigkeiten bilden den festen Kompetenzrahmen deines Hintergrunds.</p>
              </div>
              {customMode ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="background-name">Name des Hintergrunds</Label>
                    <Input id="background-name" value={backgroundName} onChange={(event) => onBackgroundNameChange(event.target.value)} placeholder="z. B. Feldheiler, Kurierin, Hofgelehrter" />
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
                </>
              ) : selectedTemplate ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/15 p-3">
                    <p className="font-medium">{selectedTemplate.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Template gewählt. Wechselst du auf ein anderes Template, werden Pool und empfohlene Trainings neu gesetzt; deine sozialen Hintergrundfelder bleiben erhalten.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {selectedTemplate.skillPool.map((skillKey) => {
                      const skill = getSagaDriveSkill(skillKey);
                      return (
                        <div key={skillKey} className="rounded-lg border border-border bg-card p-3">
                          <p className="font-medium">{skill.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Standard: {getSagaDriveAttribute(skill.attribute).shortLabel}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative border-l border-border pb-6 pl-7">
            <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-background text-xs font-semibold text-primary">2</span>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Training · 2 wählen</p>
                  <p className="text-sm text-muted-foreground">Zwei Pool-Fertigkeiten erhalten je <strong>Hintergrund +1</strong>. Empfehlungen sind optional.</p>
                </div>
                <Badge variant={trainedSkills.length === 2 ? 'default' : 'outline'}>{trainedSkills.length} / 2</Badge>
              </div>
              {poolSkills.length === 4 ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {poolSkills.map((skillKey) => {
                    const selected = trainingSet.has(skillKey);
                    const recommended = recommendationSet.has(skillKey);
                    const disabled = !selected && trainedSkills.length >= 2;
                    return (
                      <button
                        key={skillKey}
                        type="button"
                        disabled={disabled}
                        onClick={() => onTrainingToggle(skillKey)}
                        aria-pressed={selected}
                        className={`min-h-20 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{getSagaDriveSkill(skillKey).label}</p>
                          {selected ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {recommended ? <Badge variant="secondary">Empfohlen</Badge> : null}
                          {selected ? <Badge variant="outline">Hintergrund +1</Badge> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground">Vervollständige zuerst alle vier Pool-Fertigkeiten.</p>}
            </div>
          </div>

          <div className="relative border-l border-border pl-7">
            <span className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-background text-xs font-semibold text-primary">3</span>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1"><p className="font-medium">Spezialisierung</p><RuleHelp label="Spezialisierung">Eine passende Spezialisierung gibt +2 auf anwendbare Checks. Die erste Spezialisierung benötigt Fertigkeitswert 1.</RuleHelp></div>
                <p className="text-sm text-muted-foreground">Wähle ein Fachgebiet auf einer deiner beiden trainierten Fertigkeiten.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SkillSelectField
                  value={specializationSkill}
                  onValueChange={(value) => onSpecializationSkillChange(isSagaDriveSkillKey(value) ? value : '')}
                  skillOptions={trainedSkills}
                  placeholder="Trainierte Fertigkeit wählen"
                  ariaLabel="Spezialisierung Fertigkeit wählen"
                  disabled={trainedSkills.length !== 2}
                />
                <Input value={specializationName} onChange={(event) => onSpecializationNameChange(event.target.value)} placeholder="Fachgebiet, z. B. Notfallmedizin" aria-label="Spezialisierung Fachgebiet" />
              </div>
              {specializationSuggestions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Vorschläge:</span>
                  {specializationSuggestions.map((entry) => (
                    <Button key={`${entry.skillId}-${entry.name}`} type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => { onSpecializationSkillChange(entry.skillId); onSpecializationNameChange(entry.name); }}>
                      {getSagaDriveSkill(entry.skillId).label}: {entry.name}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {hasChoice ? (
        <div className="rounded-lg border border-border bg-muted/10 p-4">
          <div className="mb-4">
            <p className="font-medium">Milieu, Kontakt & Komplikation</p>
            <p className="mt-1 text-sm text-muted-foreground">Templates liefern Vorschläge. Du kannst sie übernehmen, verändern oder komplett eigene Angaben machen.</p>
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
