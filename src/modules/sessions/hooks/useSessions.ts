import { useState, useEffect, useCallback } from 'react';
import { sessionService } from '../services/session.service';
import type { SessionVm, CreateSessionDto, JoinSessionDto } from '../types/session.types';

interface UseSessionsReturn {
  sessions: SessionVm[];
  isLoading: boolean;
  error: string | null;
  createSession: (data: CreateSessionDto) => Promise<SessionVm | null>;
  joinSession: (data: JoinSessionDto) => Promise<SessionVm | null>;
  leaveSession: (sessionId: string) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
}

/**
 * Custom hook for managing sessions
 */
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await sessionService.getUserSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(async (data: CreateSessionDto): Promise<SessionVm | null> => {
    try {
      setError(null);
      const newSession = await sessionService.createSession(data);
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      console.error('Error creating session:', err);
      return null;
    }
  }, []);

  const joinSession = useCallback(async (data: JoinSessionDto): Promise<SessionVm | null> => {
    try {
      setError(null);
      const session = await sessionService.joinSession(data);
      setSessions(prev => {
        const exists = prev.find(s => s.id === session.id);
        if (exists) return prev;
        return [session, ...prev];
      });
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      console.error('Error joining session:', err);
      return null;
    }
  }, []);

  const leaveSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setError(null);
      await sessionService.leaveSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave session');
      console.error('Error leaving session:', err);
      return false;
    }
  }, []);

  return {
    sessions,
    isLoading,
    error,
    createSession,
    joinSession,
    leaveSession,
    refreshSessions: fetchSessions,
  };
}

/**
 * Hook for single session
 */
export function useSession(id: string | null) {
  const [session, setSession] = useState<SessionVm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setSession(null);
      return;
    }

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await sessionService.getSessionById(id);
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch session');
        console.error('Error fetching session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  return { session, isLoading, error };
}
