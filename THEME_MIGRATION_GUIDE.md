# Theme System Migration Guide

## Overview
This guide demonstrates the migration from the old theme system to the new unified, accessible theme system in ZapTap.

## Key Improvements

### 1. Unified Theme System
- **Before**: Two separate theme systems (`ThemeContext` and `/src/theme/`)
- **After**: Single unified system with Material Design 3 compliance

### 2. WCAG Accessibility Compliance
- **Before**: No accessibility standards
- **After**: WCAG 2.1 AA compliant with proper contrast ratios and touch targets

### 3. Type Safety
- **Before**: `any` types for theme objects
- **After**: Fully typed Theme interface with autocomplete

### 4. Performance Optimizations
- **Before**: Re-creating styles on every render
- **After**: Memoized styles with `useThemedStyles` hook

## Migration Steps

### Step 1: Update Theme Import
```typescript
// OLD
import { useTheme } from '../../contexts/ThemeContext';

// NEW
import { useUnifiedTheme, useThemedStyles } from '../../contexts/UnifiedThemeProvider';
import { Theme } from '../../theme';
```

### Step 2: Update Hook Usage
```typescript
// OLD
const { theme, themeMode, setThemeMode } = useTheme();
const styles = createStyles(theme);

// NEW
const { theme, themeMode, setThemeMode } = useUnifiedTheme();
const styles = useThemedStyles(createStyles);
```

### Step 3: Update Style Functions
```typescript
// OLD
const createStyles = (theme: any) => StyleSheet.create({
  text: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
});

// NEW
import { createTextStyle, createButtonStyle } from '../../utils/ThemeUtils';

const createStyles = (theme: Theme) => StyleSheet.create({
  text: {
    ...createTextStyle(theme, '3xl', 'bold'),
  },
  button: {
    ...createButtonStyle(theme, 'primary'),
  },
});
```

### Step 4: Update Color References
```typescript
// OLD
backgroundColor: theme.colors.primary
color: theme.colors.text
borderColor: theme.colors.border

// NEW
backgroundColor: theme.colors.brand.primary
color: theme.colors.text.primary
borderColor: theme.colors.border.medium
```

### Step 5: Add Accessibility Properties
```typescript
// OLD
<TouchableOpacity onPress={handlePress}>
  <Text>Button</Text>
</TouchableOpacity>

// NEW
<TouchableOpacity 
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="Save changes"
  accessibilityHint="Saves your profile changes"
  style={{ minHeight: theme.accessibility.minTouchTarget }}
>
  <Text>Button</Text>
</TouchableOpacity>
```

### Step 6: Remove Hardcoded Colors
```typescript
// OLD - Hardcoded colors
color: '#FFFFFF'
backgroundColor: '#6200ee'

// NEW - Theme-based colors
color: theme.colors.text.inverse
backgroundColor: theme.colors.brand.primary
```

## New Theme Structure

### Colors
```typescript
theme.colors = {
  // Backgrounds
  background: { primary, secondary, tertiary, elevated },
  
  // Surfaces (cards, modals)
  surface: { primary, secondary, elevated },
  
  // Text colors
  text: { primary, secondary, tertiary, inverse, link },
  
  // Borders
  border: { light, medium, strong },
  
  // Brand colors
  brand: { primary, primaryLight, primaryDark, secondary, accent },
  
  // Semantic colors
  semantic: { success, warning, error, info, ... },
  
  // Interactive states
  states: { hover, pressed, disabled, focus },
}
```

### Accessibility Features
```typescript
theme.accessibility = {
  minTouchTarget: 44,           // WCAG minimum
  focusOutlineWidth: 2,
  contrastRatios: {
    normal: 4.5,               // WCAG AA for normal text
    large: 3.0,                // WCAG AA for large text
    graphical: 3.0,            // WCAG AA for UI components
  },
}
```

## Component Migration Examples

### ModernProfileScreen (Completed)
- ✅ Updated to use `useUnifiedTheme`
- ✅ Added accessibility labels and hints
- ✅ Replaced hardcoded colors with theme tokens
- ✅ Added proper touch target sizes
- ✅ Implemented WCAG-compliant color usage

### Next Components to Migrate
1. **DiscoverScreen** - High priority (main screen)
2. **LibraryScreen** - High priority (main screen)
3. **BuildScreen** - High priority (main screen)
4. **AutomationCard** - High priority (used everywhere)
5. **Navigation components** - Medium priority

## Theme Utility Functions

### Available Utilities
```typescript
import {
  createTextStyle,
  createButtonStyle,
  createCardStyle,
  createInputStyle,
  addOpacity,
  ensureMinTouchTarget,
  commonStyles,
} from '../../utils/ThemeUtils';
```

### Usage Examples
```typescript
// Text styling
const titleStyle = createTextStyle(theme, 'xl', 'bold');

// Button styling
const primaryButton = createButtonStyle(theme, 'primary');

// Card styling
const cardStyle = createCardStyle(theme, true); // elevated

// Input styling
const inputStyle = createInputStyle(theme, hasError);

// Common patterns
const screenStyle = commonStyles(theme).screenContainer;
```

## Testing Checklist

### Accessibility Testing
- [ ] All interactive elements have proper `accessibilityRole`
- [ ] All buttons have meaningful `accessibilityLabel`
- [ ] Touch targets meet 44x44 minimum size
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible and clear

### Theme Testing
- [ ] Component works in light mode
- [ ] Component works in dark mode
- [ ] Component works in OLED dark mode
- [ ] Theme switching works without UI breaks
- [ ] No hardcoded colors remain

### Performance Testing
- [ ] Styles are memoized and don't recreate on every render
- [ ] Theme changes don't cause unnecessary re-renders
- [ ] Component performance is optimal

## Rollout Strategy

### Phase 1: Core Infrastructure ✅
- [x] Create unified theme system
- [x] Create theme utilities
- [x] Update App.tsx with new provider
- [x] Migrate one screen as example (ModernProfileScreen)

### Phase 2: Main Screens
- [ ] Migrate all modern/* screens
- [ ] Migrate navigation components
- [ ] Migrate core UI components

### Phase 3: Component Library
- [ ] Migrate all shared components
- [ ] Create new themed component variants
- [ ] Update all hardcoded color usage

### Phase 4: Testing & Polish
- [ ] Comprehensive accessibility testing
- [ ] Performance optimization
- [ ] Visual regression testing
- [ ] User testing with different themes

## Best Practices

1. **Always use theme tokens**: Never hardcode colors or sizes
2. **Add accessibility from the start**: Include labels and hints for all interactive elements
3. **Test in all theme modes**: Ensure components work in light, dark, and OLED modes
4. **Use utility functions**: Leverage the theme utils for consistent styling
5. **Memoize styles**: Use `useThemedStyles` to prevent unnecessary re-renders
6. **Follow Material Design 3**: Adhere to MD3 guidelines for consistency

## Migration Checklist Template

For each component migration:

- [ ] Import `useUnifiedTheme` instead of `useTheme`
- [ ] Update theme type to `Theme`
- [ ] Use `useThemedStyles` for style memoization
- [ ] Replace all hardcoded colors with theme tokens
- [ ] Add accessibility properties to interactive elements
- [ ] Ensure minimum touch target sizes
- [ ] Test in all theme modes
- [ ] Verify no TypeScript errors
- [ ] Update tests if applicable

This systematic approach ensures consistent, accessible, and maintainable theming across the entire application.