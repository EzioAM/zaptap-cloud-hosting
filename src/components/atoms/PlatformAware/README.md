# Platform-Aware Components

A comprehensive set of React Native components that automatically adapt their appearance and behavior based on the current platform (iOS, Android, Web) while maintaining a consistent API.

## Philosophy

These components follow the "write once, feel native everywhere" principle. Instead of creating separate components for each platform, these components intelligently adapt to provide the most appropriate user experience for each platform while maintaining feature parity.

## Components

### Core Hooks

#### `usePlatform()`
Central hook that provides platform detection and platform-specific utilities.

```typescript
const platform = usePlatform();

// Platform detection
platform.isIOS     // boolean
platform.isAndroid // boolean
platform.isWeb     // boolean
platform.isMobile  // boolean
platform.isTablet  // boolean

// Feature availability
platform.supportsHaptics   // boolean
platform.supportsGestures  // boolean
platform.supportsBlur      // boolean

// Platform-specific utilities
platform.select({
  ios: 'iOS value',
  android: 'Android value',
  web: 'Web value',
  default: 'Fallback value'
});

platform.getShadowStyle('medium')  // Returns platform-appropriate shadow
platform.getHitSlop('medium')      // Returns platform-appropriate hit area
```

#### `useHaptic()`
Enhanced haptic feedback hook with web fallbacks.

```typescript
const { trigger, impact, notification, selection } = useHaptic();

// Basic usage
trigger('light');          // Light impact
trigger('success');        // Success notification

// Convenience methods
impact('medium');          // Impact feedback
notification('error');     // Notification feedback
selection();              // Selection feedback
```

### UI Components

#### `PlatformButton`
Button that adapts its styling and animation to each platform.

**Platform Differences:**
- **iOS**: Scale animation, system-style appearance, 600 font weight
- **Android**: Ripple effect, Material Design styling, uppercase text, 500 font weight
- **Web**: Hover states, cursor changes, focus management

```typescript
<PlatformButton
  label="Sign In"
  variant="primary"
  size="medium"
  icon="login"
  onPress={handleSignIn}
  haptic={true}
/>
```

**Variants**: `primary`, `secondary`, `accent`, `ghost`, `outline`, `danger`, `system`
**Sizes**: `small`, `medium`, `large`

#### `PlatformCard`
Card component with platform-appropriate shadows and elevations.

**Platform Differences:**
- **iOS**: Multiple shadow layers with subtle transparency
- **Android**: Material elevation system
- **Web**: CSS box-shadow with hover effects

```typescript
<PlatformCard
  variant="elevated"
  elevation="medium"
  interactive
  onPress={handleCardPress}
>
  <Text>Card content</Text>
</PlatformCard>
```

**Variants**: `elevated`, `outlined`, `filled`, `ghost`
**Elevations**: `none`, `low`, `medium`, `high`

#### `PlatformInput`
Input field that adapts to platform conventions.

**Platform Differences:**
- **iOS**: Minimal style with subtle bottom border
- **Android**: Material outlined/filled variants with prominent focus states
- **Web**: Hover states and smooth transitions

```typescript
<PlatformInput
  variant="outlined"
  label="Email Address"
  placeholder="Enter your email"
  leftIcon="email"
  keyboardType="email-address"
  value={email}
  onChangeText={setEmail}
  required
/>
```

**Variants**: `outlined`, `filled`, `underlined`, `minimal`
**Features**: Floating labels, icons, validation states, haptic feedback

#### `PlatformModal`
Modal with platform-specific presentation styles and gestures.

**Platform Differences:**
- **iOS**: Slide up from bottom, drag-to-dismiss gestures
- **Android**: Fade in with material scrim
- **Web**: Centered with backdrop, keyboard navigation

```typescript
<PlatformModal
  isVisible={isVisible}
  onClose={handleClose}
  presentationStyle="sheet"
  dragToClose={true}
>
  <View>Modal content</View>
</PlatformModal>
```

**Presentation Styles**: `sheet`, `card`, `fullscreen`, `popup`
**Animation Types**: `slide`, `fade`, `scale`, `none`

#### `PlatformNavigator`
Navigation utilities with platform-appropriate transitions.

**Platform Differences:**
- **iOS**: Horizontal slide with gesture support, translucent headers
- **Android**: Default material transitions, elevated headers
- **Web**: Fade transitions, web-appropriate navigation

```typescript
const screenOptions = usePlatformScreenOptions({
  transition: 'slide',
  gesturesEnabled: true,
});

// Or use pre-configured options
const options = usePlatformNavigationOptions();
```

## Usage Examples

### Basic Implementation

```typescript
import React from 'react';
import { View } from 'react-native';
import {
  PlatformButton,
  PlatformCard,
  PlatformInput,
  usePlatform,
} from '../components/atoms/PlatformAware';

export const MyScreen = () => {
  const platform = usePlatform();
  
  return (
    <View style={{ padding: 16 }}>
      <PlatformCard variant="elevated">
        <PlatformInput
          label="Email"
          variant={platform.select({
            ios: 'minimal',
            android: 'outlined',
            default: 'filled'
          })}
          placeholder="Enter email"
        />
        
        <PlatformButton
          label="Submit"
          variant="primary"
          onPress={handleSubmit}
          fullWidth
        />
      </PlatformCard>
    </View>
  );
};
```

### Advanced Customization

```typescript
import React from 'react';
import { PlatformButton, usePlatform } from '../components/atoms/PlatformAware';

export const CustomButton = () => {
  const platform = usePlatform();
  
  // Platform-specific styling
  const customStyle = platform.select({
    ios: {
      shadowColor: '#000',
      ...platform.getShadowStyle('low'),
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
    },
    default: {},
  });
  
  return (
    <PlatformButton
      label="Custom Button"
      style={customStyle}
      haptic={platform.supportsHaptics}
      onPress={() => {
        // Platform-specific logic
        if (platform.isWeb) {
          // Web-specific handling
        } else {
          // Mobile-specific handling
        }
      }}
    />
  );
};
```

## Best Practices

### 1. Use Platform Detection Wisely
Only use platform detection when truly necessary. The components handle most platform differences automatically.

```typescript
// ✅ Good - let the component handle it
<PlatformButton label="Submit" onPress={handleSubmit} />

// ❌ Avoid - unnecessary platform detection
{platform.isIOS && <IOSButton />}
{platform.isAndroid && <AndroidButton />}
```

### 2. Leverage Platform Selection
Use `platform.select()` for platform-specific values.

```typescript
// ✅ Good
const iconSize = platform.select({
  ios: 24,
  android: 20,
  web: 22,
  default: 20
});

// ❌ Avoid nested conditionals
const iconSize = platform.isIOS ? 24 : platform.isAndroid ? 20 : 22;
```

### 3. Respect Platform Conventions
Don't force one platform's patterns onto another.

```typescript
// ✅ Good - respects platform conventions
<PlatformInput
  variant="outlined" // Android gets outlined, iOS gets minimal
  label="Email"
/>

// ❌ Avoid - forces iOS style everywhere
<PlatformInput
  variant="minimal"
  label="Email"
/>
```

### 4. Use Haptic Feedback Appropriately
Enable haptic feedback for interactive elements but allow users to disable it.

```typescript
// ✅ Good - haptic feedback with fallback
const { trigger } = useHaptic({ 
  enabled: userPreferences.hapticsEnabled 
});

// ❌ Avoid - always-on haptics
trigger('heavy'); // This might be too aggressive
```

## Testing

### Platform Testing
Test components on all target platforms to ensure proper adaptation.

```typescript
// Test platform detection
expect(usePlatform().isIOS).toBe(true); // when running on iOS

// Test platform-specific styling
const button = render(<PlatformButton label="Test" />);
expect(button).toHaveStyle(expectedIOSStyle); // on iOS
```

### Accessibility Testing
Ensure components maintain accessibility across platforms.

```typescript
<PlatformButton
  label="Submit"
  accessibilityLabel="Submit form"
  accessibilityHint="Submits the current form data"
/>
```

## Performance Considerations

### 1. Memoization
Platform detection results are memoized to prevent unnecessary recalculations.

### 2. Conditional Loading
Components only load platform-specific code when needed.

### 3. Animation Performance
Animations use native drivers where available and fall back gracefully.

## Troubleshooting

### Common Issues

1. **Haptic feedback not working on web**
   - This is expected behavior. The hook provides visual/vibration fallbacks.

2. **Gestures not responding**
   - Ensure `react-native-gesture-handler` is properly installed and configured.

3. **Shadows not appearing**
   - Check that the component has appropriate elevation settings and isn't being clipped.

4. **Animations stuttering**
   - Verify that `react-native-reanimated` is properly configured for your platform.

## Migration Guide

### From Regular Components

```typescript
// Before
import { Button } from 'react-native';
<Button title="Submit" onPress={handleSubmit} />

// After  
import { PlatformButton } from '../components/atoms/PlatformAware';
<PlatformButton label="Submit" onPress={handleSubmit} />
```

### From Platform-Specific Components

```typescript
// Before
{Platform.OS === 'ios' ? <IOSButton /> : <AndroidButton />}

// After
<PlatformButton variant="system" />
```

This platform-aware component system provides a robust foundation for building truly native-feeling cross-platform applications while maintaining code simplicity and consistency.