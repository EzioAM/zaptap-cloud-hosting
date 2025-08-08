import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { EventLogger } from '../utils/EventLogger';

export const useRealAutomationStats = (automationId: string | undefined) => {
  const [stats, setStats] = useState({
    likes: 0,
    downloads: 0,
    rating: 0,
    ratingCount: 0,
    runs: 0,
    views: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (automationId && automationId !== 'undefined' && automationId !== 'null') {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [automationId]);

  const fetchStats = async () => {
    if (!automationId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get automation stats from Supabase
      const { data: automation, error } = await supabase
        .from('automations')
        .select('likes_count, downloads_count, average_rating, rating_count, execution_count, view_count')
        .eq('id', automationId)
        .single();

      if (error) {
        EventLogger.error('useRealAutomationStats', 'Failed to fetch stats', error, { automationId });
        setIsLoading(false);
        return;
      }

      if (automation) {
        setStats({
          likes: automation.likes_count || 0,
          downloads: automation.downloads_count || 0,
          rating: automation.average_rating || 0,
          ratingCount: automation.rating_count || 0,
          runs: automation.execution_count || 0,
          views: automation.view_count || 0,
        });
        
        EventLogger.debug('useRealAutomationStats', 'Stats fetched', { 
          automationId, 
          stats: automation 
        });
      }

      setIsLoading(false);
    } catch (error) {
      EventLogger.error('useRealAutomationStats', 'Exception fetching stats', error as Error);
      setIsLoading(false);
    }
  };

  const incrementStat = async (statType: 'likes' | 'downloads' | 'runs' | 'views') => {
    if (!automationId) return;

    try {
      const columnMap = {
        likes: 'likes_count',
        downloads: 'downloads_count',
        runs: 'execution_count',
        views: 'view_count',
      };

      const column = columnMap[statType];
      
      // Increment the stat in Supabase
      const { data, error } = await supabase.rpc('increment_automation_stat', {
        automation_id: automationId,
        stat_column: column,
      });

      if (!error) {
        // Update local state
        setStats(prev => ({
          ...prev,
          [statType === 'runs' ? 'runs' : statType]: prev[statType === 'runs' ? 'runs' : statType] + 1,
        }));
      }
    } catch (error) {
      EventLogger.error('useRealAutomationStats', `Failed to increment ${statType}`, error as Error);
    }
  };

  return { 
    stats, 
    isLoading, 
    refetch: fetchStats,
    incrementLikes: () => incrementStat('likes'),
    incrementDownloads: () => incrementStat('downloads'),
    incrementRuns: () => incrementStat('runs'),
    incrementViews: () => incrementStat('views'),
  };
};