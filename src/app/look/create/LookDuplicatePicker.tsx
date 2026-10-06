/**
 * LookDuplicatePicker — Pick an existing Look to duplicate (#353).
 * Location: src/app/look/create/LookDuplicatePicker.tsx
 */
import { useEffect, useState } from 'react';
import type { LookProfileRecord } from '../../../domains/look';
import { duplicateLookProfile, listLookProfiles } from '../../../infrastructure/look';
import { Button } from '../../../shared/ui/button';

export type LookDuplicatePickerProps = {
  onBack: () => void;
  onDuplicated: (lookId: string) => void;
};

export function LookDuplicatePicker({ onBack, onDuplicated }: LookDuplicatePickerProps) {
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listLookProfiles();
        if (!cancelled) setLooks(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Looks konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDuplicate = async (profileId: string, displayName: string) => {
    if (busyId) return;
    setBusyId(profileId);
    setError(null);
    try {
      const copy = await duplicateLookProfile({
        sourceProfileId: profileId,
        displayName: `${displayName.trim() || 'Look'} (Kopie)`,
      });
      onDuplicated(copy.profile.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplizieren fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col gap-4 p-4" data-look-duplicate-picker>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" className="min-h-11" onClick={onBack}>
          Zurück
        </Button>
        <h1 className="text-lg font-semibold">Look duplizieren</h1>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Lädt Looks…</p>
      ) : looks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Looks zum Duplizieren.</p>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {looks.map((row) => (
            <li
              key={row.profile.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.current.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Version {row.profile.currentVersion}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                disabled={busyId !== null}
                onClick={() => void handleDuplicate(row.profile.id, row.current.displayName)}
                data-look-duplicate-pick={row.profile.id}
              >
                {busyId === row.profile.id ? '…' : 'Duplizieren'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
