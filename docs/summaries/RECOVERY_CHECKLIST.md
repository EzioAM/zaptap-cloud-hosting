# 🚨 ZAPTAP Recovery Checklist

## System Status Tests

### 1. Redux Store Test
- [ ] Shows "✅ Redux Connected" 
- [ ] Displays auth state (authenticated: yes/no)
- [ ] Shows user email (if logged in)
- [ ] "Test Dispatch" button works without errors

**If Redux fails:**
- Check console for "Redux selector error"
- May need to clear AsyncStorage
- Redux persist might have corrupted data

### 2. Supabase Connection Test
- [ ] Shows "✅ Supabase Connected"
- [ ] Network status: Online
- [ ] Click "Test Query" - should show automation count
- [ ] Click "Test Auth" - shows auth status
- [ ] Click "Retry Connection" if initially failed

**If Supabase fails:**
- Check network connection
- Verify .env file has correct credentials
- Look for JWT/auth errors in console

### 3. Theme System Test
- [ ] Paper Theme: "✅ Paper Theme Working"
- [ ] Shows theme colors (primary, background, surface)
- [ ] Click "Test UnifiedTheme" button
- [ ] UnifiedTheme status (likely to fail initially)

**If UnifiedTheme fails:**
- Expected initially due to circular imports
- We'll fix this in Phase 3
- Paper theme should still work

### 4. Screen Loader Test
- [ ] Click "Test All Screens" button
- [ ] Check which screens show "✅ Valid component"
- [ ] Note which screens show errors

**Common screen errors:**
- "useUnifiedTheme not found" - theme dependency
- "Cannot read property" - missing context/provider
- Module not found - import errors

## Interpreting Results

### 🟢 All Green (Unlikely)
- Redux ✅
- Supabase ✅
- Paper Theme ✅
- Some screens ✅

**Action:** Skip to Phase 2 - restore navigation

### 🟡 Mixed Results (Expected)
- Redux ✅
- Supabase ✅ or ⚠️
- Paper Theme ✅
- UnifiedTheme ❌
- Most screens ❌

**Action:** Continue with Phase 2 - fix screens one by one

### 🔴 Major Failures
- Redux ❌
- Supabase ❌
- Theme ❌

**Action:** Fix critical systems first before proceeding

## Console Logs to Check

Open developer console and look for:
```
🚨 App.tsx loading...
🚨 SafeAreaProvider rendered
🚨 ReduxProvider rendered
🚨 ThemeProvider rendered
🚨 Navigation ready
🔍 Redux auth state: {...}
🔍 Testing Supabase connection...
✅ Supabase connected successfully
```

## Next Steps Based on Results

1. **If Redux works:** Keep current store configuration
2. **If Supabase works:** Test creating/loading automations
3. **If screens fail:** Start with HomeScreen first
4. **If theme fails:** Use Paper theme until fixed

## Emergency Fallbacks

If nothing works:
```bash
# Use ultra-simple mode
node emergency-recovery.js 1

# Clear all caches
cd ios && pod cache clean --all
cd android && ./gradlew clean
npm start -- --reset-cache
```