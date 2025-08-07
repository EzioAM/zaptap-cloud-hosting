# Next Steps for Testing Stack Overflow Fixes

## Immediate Testing

1. **Clear everything and restart:**
   ```bash
   # Kill any running Expo processes
   pkill -f expo
   
   # Clear all caches
   npx expo start --clear
   ```

2. **Watch the console for:**
   - `🚨 STACK OVERFLOW` messages - These are now caught and handled
   - `[Redux] Circular reference` - These are automatically cleaned
   - `[SafeComponent]` - Component protection messages
   - The app should NOT crash after 3 seconds

## If Stack Overflow Still Occurs

The global error handler will now:
1. Catch the error
2. Log where it's happening
3. Prevent the app from crashing

Look for the console message: `🚨 STACK OVERFLOW #1 DETECTED`

This will tell you exactly where the issue is coming from.

## How to Use the New Protection

### For New Components
```typescript
import { withStackOverflowProtection } from '@/utils/SafeComponent';

// Wrap any suspicious component
export default withStackOverflowProtection(YourComponent, 'YourComponent');
```

### For Array Operations
```typescript
import { safeMap, safeFilter } from '@/utils/safeArrayOperations';

// Replace dangerous operations
// OLD: items.map(item => item.value)
// NEW: 
safeMap(items, item => item.value);
```

### For State Management
```typescript
import { hasCircularReference, removeCircularReferences } from '@/utils/circularReferenceDetector';

// Check before setting state
if (hasCircularReference(newData)) {
  newData = removeCircularReferences(newData);
}
setState(newData);
```

## Debugging Information

The new system provides detailed debugging:

1. **Redux Issues** - Check for `[Redux]` prefix in console
2. **Component Issues** - Check for `[SafeComponent]` prefix
3. **Array Issues** - Check for `safeMap:`, `safeFilter:` prefixes
4. **Circular References** - Look for "Circular reference detected" messages

## Re-enabling PerformanceAnalyzer

Once confirmed stable, you can try re-enabling PerformanceAnalyzer:

1. In `App.tsx`, uncomment the import:
   ```typescript
   import { PerformanceAnalyzer } from './src/utils/PerformanceAnalyzer';
   ```

2. Re-enable initialization (line ~67):
   ```typescript
   if (__DEV__) {
     setTimeout(() => {
       try {
         PerformanceAnalyzer.initialize();
       } catch (error) {
         console.warn('PerformanceAnalyzer initialization failed:', error);
       }
     }, 3000);
   }
   ```

3. If it crashes again, the error handler will tell you exactly why.

## Performance Monitoring

The app now has multiple layers of protection:
- **Level 1**: Input validation (prevents bad data)
- **Level 2**: Redux middleware (cleans state)
- **Level 3**: Component boundaries (catches errors)
- **Level 4**: Global handler (prevents crashes)

Even with all protections, the performance impact is minimal because:
- Checks only run on objects
- Most logging is development-only
- Circular reference checks use WeakSet (fast)

## Success Indicators

✅ App starts without crashing
✅ No stack overflow after 3 seconds
✅ Console shows protection messages but app continues
✅ Redux state remains clean
✅ Components render without infinite loops

## Contact for Issues

If stack overflow still occurs:
1. Check the console for the new debug messages
2. The `Stack trace sample` will show exactly where it's happening
3. Wrap that specific component/function with the safe wrappers

The app is now resilient and will continue running even if issues are detected!