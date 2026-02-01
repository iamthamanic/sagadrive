// ============================================
// RULESETS Module - React Hooks
// ============================================

import { useState, useEffect } from 'react';
import { rulesetService } from '../services/ruleset.service';
import type { Ruleset } from '../types/ruleset.types';

export function useRulesets() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRulesets();
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
    loadRulesets();
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
