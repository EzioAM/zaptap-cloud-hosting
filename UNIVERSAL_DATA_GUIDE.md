# Universal Data Integration Implementation Guide

## Current State
The app now has a **UniversalDataService** that provides a single source of truth for all data operations.

## ✅ What's Been Created

### 1. **UniversalDataService** (`/src/services/data/UniversalDataService.ts`)
- Single source of truth for all Supabase data
- Built-in caching (5-minute timeout)
- Real-time subscriptions
- Consistent error handling
- Methods for all data operations

### 2. **Universal Hooks** (`/src/hooks/useUniversalData.ts`)
- `useAutomation(id)` - Get single automation
- `useAutomations(filters)` - Get filtered automations
- `useAutomationStats(id)` - Get automation statistics
- `useCategoryCounts()` - Get real category counts
- `useUserProfile(userId)` - Get user profile
- `useUserStats(userId)` - Get user statistics
- `useFeaturedAutomations()` - Get featured automations
- `useTrendingAutomations()` - Get trending automations
- `useTemplates(category)` - Get templates
- Plus mutation hooks for create/update/delete

### 3. **Existing Hooks** (Still work, but should migrate)
- `useRealCategoryCounts()` - Works, but use `useCategoryCounts()` instead
- `useRealAutomationStats()` - Works, but use `useAutomationStats()` instead

## 📋 Implementation Checklist

### HomeScreen (`/src/screens/modern/ModernHomeScreen.tsx`)
```typescript
// BEFORE (Hardcoded)
const sampleAutomations = [
  { id: 'sample_1', title: 'Focus Mode Ultra', ... },
  // ... hardcoded data
];

// AFTER (Real Data)
import { useAutomations, useFeaturedAutomations } from '../../hooks/useUniversalData';

const { data: featuredAutomations, loading } = useFeaturedAutomations();
const { data: recentAutomations } = useAutomations({ 
  userId: user?.id,
  limit: 5,
  orderBy: 'created_at' 
});
```

### DiscoverScreen (`/src/screens/modern/DiscoverScreen.tsx`)
```typescript
// Already partially updated, but complete with:
import { useAutomations, useCategoryCounts } from '../../hooks/useUniversalData';

// Replace useRealCategoryCounts with:
const { categoryCounts, isLoading } = useCategoryCounts();

// Get automations based on filters:
const { data: automations } = useAutomations({
  category: selectedCategory,
  search: searchQuery,
  isPublic: true,
  limit: 50
});
```

### LibraryScreen (`/src/screens/modern/LibraryScreen.tsx`)
```typescript
import { useAutomations } from '../../hooks/useUniversalData';

const { data: myAutomations, loading, refetch } = useAutomations({
  userId: user?.id,
  orderBy: 'created_at'
});
```

### AutomationDetailsScreen (`/src/screens/automation/AutomationDetailsScreen.tsx`)
```typescript
import { useRealtimeAutomation, useAutomationStats } from '../../hooks/useUniversalData';

const { automation, loading } = useRealtimeAutomation(automationId);
const { data: stats } = useAutomationStats(automationId);
```

### ProfileScreen (`/src/screens/modern/ModernProfileScreen.tsx`)
```typescript
import { useUserStats, useAutomations } from '../../hooks/useUniversalData';

const { data: userStats } = useUserStats(user?.id);
const { data: userAutomations } = useAutomations({ userId: user?.id });
```

### TemplatesScreen (`/src/screens/automation/TemplatesScreen.tsx`)
```typescript
import { useTemplates } from '../../hooks/useUniversalData';

const { data: templates, loading } = useTemplates(selectedCategory);
```

### BuildScreen (`/src/screens/modern/BuildScreen.tsx`)
```typescript
import { useTemplates, useCreateAutomation } from '../../hooks/useUniversalData';

const { data: suggestedTemplates } = useTemplates();
const { create, loading } = useCreateAutomation();
```

### Dashboard Widgets
```typescript
import { useUserStats, useCategoryCounts } from '../../hooks/useUniversalData';

const StatsWidget = () => {
  const { data: stats } = useUserStats(userId);
  return <View>Real stats: {stats?.totalAutomations}</View>;
};
```

### Automation Cards (Everywhere)
```typescript
import { useAutomationStats } from '../../hooks/useUniversalData';

const AutomationCard = ({ automationId }) => {
  const { data: stats } = useAutomationStats(automationId);
  
  return (
    <View>
      <Text>❤️ {stats?.likes || 0}</Text>
      <Text>⬇️ {stats?.downloads || 0}</Text>
      <Text>▶️ {stats?.runs || 0}</Text>
    </View>
  );
};
```

## 🔄 Migration Strategy

### Phase 1: Replace Read Operations (Safe)
1. Replace all `useGetPublicAutomationsQuery` with `useAutomations({ isPublic: true })`
2. Replace all `useGetMyAutomationsQuery` with `useAutomations({ userId })`
3. Replace hardcoded category counts with `useCategoryCounts()`
4. Replace hardcoded stats with `useAutomationStats()`

### Phase 2: Replace Write Operations
1. Replace automation creation with `useCreateAutomation()`
2. Replace automation updates with `useUpdateAutomation()`
3. Replace automation deletion with `useDeleteAutomation()`
4. Replace stat increments with `useIncrementStat()`

### Phase 3: Add Real-time Features
1. Use `useRealtimeAutomation()` for live updates in details screen
2. Subscribe to category changes for live count updates
3. Add real-time collaboration features

## 🎯 Benefits of Universal Data

1. **Single Source of Truth**: All data comes from one service
2. **Automatic Caching**: 5-minute cache reduces API calls
3. **Real-time Updates**: Subscriptions keep data fresh
4. **Consistent Error Handling**: Same error pattern everywhere
5. **Type Safety**: TypeScript interfaces throughout
6. **Offline Support**: Cache works offline
7. **Performance**: Reduced re-renders with proper caching

## 🚀 Quick Start

To use real data anywhere in the app:

```typescript
// Import the hook you need
import { 
  useAutomations, 
  useAutomationStats,
  useCategoryCounts,
  useUserStats 
} from '../../hooks/useUniversalData';

// Use it in your component
const MyComponent = () => {
  const { data, loading, error, refetch } = useAutomations({
    category: 'productivity',
    limit: 10
  });

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorState onRetry={refetch} />;
  
  return <FlatList data={data?.data} ... />;
};
```

## 📊 Database Requirements

Ensure your Supabase database has these columns:

### automations table:
- id (uuid)
- title (text)
- description (text)
- category (text)
- created_by (uuid)
- is_public (boolean)
- likes_count (int)
- downloads_count (int)
- execution_count (int)
- view_count (int)
- average_rating (float)
- rating_count (int)
- created_at (timestamp)
- updated_at (timestamp)

### profiles table:
- id (uuid)
- email (text)
- full_name (text)
- avatar_url (text)
- created_at (timestamp)

## 🔍 Debugging

Enable debug logs:
```typescript
// In UniversalDataService.ts
EventLogger.debug('UniversalDataService', 'Cache hit/miss', { key, hit: !!cached });
```

Clear cache manually:
```typescript
import { dataService } from '../services/data/UniversalDataService';
dataService.invalidateCache(); // Clear all
dataService.invalidateCache('automations'); // Clear specific
```

## ✅ Next Steps

1. **Immediate**: Start using `useAutomations()` instead of RTK Query in new code
2. **This Week**: Migrate HomeScreen and DiscoverScreen fully
3. **Next Week**: Migrate all screens to universal hooks
4. **Future**: Add offline queue for mutations

---

The Universal Data Service is ready to use NOW. Start with one screen and gradually migrate the rest!