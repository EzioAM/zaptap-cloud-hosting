import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/data/UniversalDataService';

// ========== BASE HOOK ==========

export function useUniversalData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ========== AUTOMATION HOOKS ==========

export function useAutomation(id: string | undefined) {
  return useUniversalData(
    () => id ? dataService.getAutomation(id) : Promise.resolve(null),
    [id]
  );
}

export function useAutomations(filters?: {
  category?: string;
  isPublic?: boolean;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  trending?: boolean;
}) {
  return useUniversalData(
    () => dataService.getAutomations(filters),
    [JSON.stringify(filters)]
  );
}

export function useAutomationStats(id: string | undefined) {
  return useUniversalData(
    () => id ? dataService.getAutomationStats(id) : Promise.resolve(null),
    [id]
  );
}

export function useFeaturedAutomations() {
  return useUniversalData(
    () => dataService.getFeaturedAutomations(),
    []
  );
}

export function useTrendingAutomations() {
  return useUniversalData(
    () => dataService.getTrendingAutomations(),
    []
  );
}

export function useRecentAutomations() {
  return useUniversalData(
    () => dataService.getRecentAutomations(),
    []
  );
}

export function useTemplates(category?: string) {
  return useUniversalData(
    () => dataService.getTemplates(category),
    [category]
  );
}

// ========== CATEGORY HOOKS ==========

export function useCategoryCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await dataService.getCategoryCounts();
      setCounts(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();

    // Subscribe to real-time updates
    const unsubscribe = dataService.subscribeToCategories(() => {
      fetch();
    });

    return unsubscribe;
  }, []);

  return { categoryCounts: counts, isLoading: loading, error, refetch: fetch };
}

// ========== USER HOOKS ==========

export function useUserProfile(userId: string | undefined) {
  return useUniversalData(
    () => userId ? dataService.getUserProfile(userId) : Promise.resolve(null),
    [userId]
  );
}

export function useUserStats(userId: string | undefined) {
  return useUniversalData(
    () => userId ? dataService.getUserStats(userId) : Promise.resolve(null),
    [userId]
  );
}

// ========== MUTATION HOOKS ==========

export function useIncrementStat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const increment = useCallback(async (
    automationId: string,
    stat: 'likes' | 'downloads' | 'runs' | 'views'
  ) => {
    try {
      setLoading(true);
      setError(null);
      await dataService.incrementStat(automationId, stat);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { increment, loading, error };
}

export function useCreateAutomation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (automation: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dataService.createAutomation(automation);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

export function useUpdateAutomation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, updates: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dataService.updateAutomation(id, updates);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

export function useDeleteAutomation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteAutomation = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await dataService.deleteAutomation(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteAutomation, loading, error };
}

// ========== REAL-TIME HOOKS ==========

export function useRealtimeAutomation(automationId: string | undefined) {
  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!automationId) {
      setLoading(false);
      return;
    }

    const loadAutomation = async () => {
      try {
        setLoading(true);
        const data = await dataService.getAutomation(automationId);
        setAutomation(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadAutomation();

    // Subscribe to real-time updates
    const unsubscribe = dataService.subscribeToAutomation(automationId, (payload) => {
      if (payload.eventType === 'DELETE') {
        setAutomation(null);
      } else {
        setAutomation(payload.new);
      }
    });

    return unsubscribe;
  }, [automationId]);

  return { automation, loading, error };
}

// ========== CACHE MANAGEMENT ==========

export function useCacheInvalidation() {
  const invalidate = useCallback((pattern?: string) => {
    dataService.invalidateCache(pattern);
  }, []);

  return { invalidate };
}