import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { EventLogger } from '../utils/EventLogger';

interface CategoryCount {
  category: string;
  count: number;
}

export const useRealCategoryCounts = () => {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      // Get all public automations
      const { data, error } = await supabase
        .from('automations')
        .select('category, created_at, likes_count, average_rating')
        .eq('is_public', true);

      if (error) {
        EventLogger.error('useRealCategoryCounts', 'Failed to fetch category counts', error);
        setIsLoading(false);
        return;
      }

      // Count automations per category
      const counts: Record<string, number> = {
        all: 0,
        popular: 0,
        new: 0,
      };

      if (data && data.length > 0) {
        // Count by category
        data.forEach((automation) => {
          const category = automation.category || 'other';
          counts[category] = (counts[category] || 0) + 1;
          counts.all += 1;
        });

        // Count popular (high likes or rating)
        const popularItems = data.filter(item => 
          (item.likes_count && item.likes_count >= 50) || 
          (item.average_rating && item.average_rating >= 4.5)
        );
        counts.popular = popularItems.length;

        // Count new (created in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const newItems = data.filter(item => {
          const createdAt = new Date(item.created_at);
          return createdAt >= sevenDaysAgo;
        });
        counts.new = newItems.length;
      }

      setCategoryCounts(counts);
      setIsLoading(false);
      
      EventLogger.debug('useRealCategoryCounts', 'Category counts fetched', counts);
    } catch (error) {
      EventLogger.error('useRealCategoryCounts', 'Exception fetching counts', error as Error);
      setIsLoading(false);
    }
  };

  return { categoryCounts, isLoading, refetch: fetchCategoryCounts };
};