/**
 * SagaCreateForm — Create a Saga via project-service (#489).
 * Location: src/app/project/SagaCreateForm.tsx
 *
 * User-facing „Saga“; persistence stays on projects table.
 */
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { useWorldProfiles } from '../world';
import { useProjects } from './hooks/useProjects';

export type SagaCreateFormProps = {
  onCancel: () => void;
  onCreated: (sagaPublicId: string) => void;
};

export function SagaCreateForm({ onCancel, onCreated }: SagaCreateFormProps) {
  const { createProject } = useProjects();
  const { worlds, isLoading: worldsLoading } = useWorldProfiles({ enabled: true });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [worldProfileId, setWorldProfileId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Bitte gib einen Saganamen ein');
      return;
    }
    setSaving(true);
    try {
      const created = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        world_profile_id: worldProfileId || undefined,
      });
      const publicId = created.publicId?.trim();
      if (!publicId) {
        throw new Error('Saga wurde erstellt, aber ohne Public ID.');
      }
      toast.success(`Saga erstellt! Code: ${created.code}`, {
        duration: 6000,
        description: 'Teile den Code mit Spielern zum Beitreten.',
      });
      onCreated(publicId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saga konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} data-saga-create-form>
      <div className="space-y-2">
        <Label htmlFor="saga-name">Name *</Label>
        <Input
          id="saga-name"
          className="min-h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Die Silberne Krone"
          disabled={saving}
          autoFocus
          data-saga-create-name
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saga-description">Beschreibung (optional)</Label>
        <Input
          id="saga-description"
          className="min-h-11"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kurzer Pitch"
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saga-world">Weltprofil (optional)</Label>
        <select
          id="saga-world"
          className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={worldProfileId}
          onChange={(e) => setWorldProfileId(e.target.value)}
          disabled={saving || worldsLoading}
          data-saga-create-world
        >
          <option value="">Keine Welt verknüpfen</option>
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" className="min-h-11" disabled={saving} data-saga-create-submit>
          {saving ? 'Erstellt…' : 'Saga erstellen'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={saving}
          onClick={onCancel}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
