/**
 * useRulesets — App-slice hooks for loading ruleset catalog data.
 * Location: src/app/rulesets/hooks/useRulesets.ts
 */
import { useEffect, useState } from 'react';
import type { Ruleset } from '../../../domains/rules/ruleset-catalog';
import { rulesetService } from '../../../infrastructure/rulesets/ruleset-service';

export function useRulesets() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void loadRulesets();
  }, []);

  const loadRulesets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rulesetService.getAll();
      setRulesets(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading rulesets:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    rulesets,
    loading,
    error,
    reload: loadRulesets,
  };
}

export function useOfficialRulesets() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void loadRulesets();
  }, []);

  const loadRulesets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rulesetService.getOfficial();
      setRulesets(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading official rulesets:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    rulesets,
    loading,
    error,
    reload: loadRulesets,
  };
}
