# Phase 1A: Cleanup Manifest

## Files Identified for Removal

### 1. Backup Files (Root Directory)
- [ ] `/App.tsx.backup`
- [ ] `/app.json.backup`

### 2. Optimized/Performance Variant Files
These are duplicate implementations that are no longer needed:
- [ ] `/src/utils/EventLogger.optimized.ts` (duplicate of EventLogger.ts)
- [ ] `/src/screens/HomeScreen.optimized.tsx` (old home screen variant)
- [ ] `/src/screens/modern/ModernHomeScreenOptimized.tsx` (duplicate variant)
- [ ] `/src/screens/modern/ModernHomeScreenPerformanceFixed.tsx` (duplicate variant)
- [ ] `/src/screens/modern/DiscoverScreenOptimized.tsx` (duplicate variant)
- [ ] `/src/App.optimized.tsx` (duplicate of App.tsx)
- [ ] `/src/components/organisms/DashboardWidgets/QuickStatsWidgetOptimized.tsx` (duplicate widget)

### 3. Backup Screen Files
- [ ] `/src/screens/modern/DiscoverScreen.backup.tsx`
- [ ] `/src/screens/modern/LibraryScreen_backup.tsx`
- [ ] `/src/screens/modern/ModernReviewsScreenSafe.tsx` (safe variant, using regular version)

### 4. API Backup Files
- [ ] `/src/store/api/automationApi.ts.backup`
- [ ] `/src/store/api/analyticsApi.ts.backup`

### 5. Placeholder Screens (Already Replaced)
These placeholder screens have been replaced with proper implementations:
- [ ] `/src/screens/placeholder/ChangePasswordScreen.tsx` (replaced by auth/ChangePasswordScreen)
- [ ] `/src/screens/placeholder/EditProfileScreen.tsx` (replaced by profile/EditProfileScreen)
- [ ] `/src/screens/placeholder/EmailPreferencesScreen.tsx` (replaced by settings/EmailPreferencesScreen)

### 6. Old Migration Files
Located in `/supabase/old_migrations/`:
- All 28 old migration files (already moved to old_migrations folder)

### 7. Test/Debug Files
- [ ] `/src/utils/EventLoggerMigration.ts` (migration utility, no longer needed)
- [ ] `/EVENTLOGGER_PERFORMANCE_REVIEW.md` (old performance review doc)
- [ ] `/scripts/test-eventlogger-performance.js` (old test script)

### 8. Duplicate Navigation Files
Located in `/src/navigation/archive/`:
- [ ] `EmergencyBottomTabNavigator.tsx` (emergency fallback, using main navigator)
- [ ] `LazyNavigator.tsx` (old lazy loading approach)

### 9. SQL Test Files (Root)
- [ ] `/-- View all tables.sql` (test SQL file)
- [ ] `/backup_before_rls_optimization.sql` (old backup)

### 10. Test Scripts (Root)
- [ ] `/fix_crash.sh` (old fix script)
- [ ] `/test_fixes.sh` (old test script)

## Files to Keep

### Important Documentation
- ✅ `/CLAUDE.md` - Project instructions
- ✅ `/NAVIGATION_VALIDATION_REPORT.md` - Phase 4 validation report
- ✅ `/docs/RLS_OPTIMIZATION_GUIDE.md` - Database optimization guide

### Configuration Files
- ✅ `/supabase/config.toml` - Supabase configuration
- ✅ `/supabase/.gitignore` - Git ignore for Supabase

### Current Migration Files
- ✅ `/supabase/migrations/` - Keep only current migrations (20240104-20240108)

## Summary

**Total Files to Remove:** 38 files
- Backup files: 13
- Optimized/variant files: 7
- Placeholder screens: 3
- Old migrations: 28 (already in archive)
- Test/debug files: 5
- SQL files: 2
- Script files: 2

**Estimated Space Saved:** ~2-3 MB

## Removal Strategy

1. **Archive First**: Create a backup archive before deletion
2. **Remove in Batches**: Delete by category to ensure nothing breaks
3. **Test After Each Batch**: Run the app after each category removal
4. **Commit Changes**: Git commit after successful removal

Would you like to proceed with the cleanup?