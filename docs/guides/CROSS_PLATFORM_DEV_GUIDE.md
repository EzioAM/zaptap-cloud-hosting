# Cross-Platform Development Guide

## 🎯 Strategy: Shared Codebase, Platform-Specific Builds

### Current Setup
- ✅ **Shared Business Logic**: All automation logic works on both platforms
- ✅ **Unified UI Components**: React Native components render natively on both
- ✅ **Platform-Aware Services**: Services detect and adapt to iOS/Android differences
- ✅ **Cross-Platform Navigation**: React Navigation works identically on both

## 🔄 Development Workflow

### Primary Development (Android)
Since you're continuing on Android while iOS developer account is setup:

```bash
# Daily development on Android
npm run dev:android

# Build and test on physical Android device
npm run run:android
```

### iOS Compatibility Testing
Regularly test on iOS to ensure compatibility:

```bash
# Test on iOS simulator when making major changes
npm run dev:ios

# Test on iPhone once developer account is ready
npm run run:ios
```

### Both Platforms Simultaneously
```bash
# Run on both platforms at once
npm run dev:both
```

## 📱 Platform-Specific Considerations

### Feature Parity Matrix

| Feature | iOS | Android | Implementation |
|---------|-----|---------|----------------|
| NFC Reading/Writing | ✅ Full | ✅ Full | `react-native-nfc-manager` |
| QR Code Scanning | ✅ Full | ✅ Full | `expo-camera` |
| Location Services | ✅ Full | ✅ Full | `expo-location` |
| SMS Integration | ✅ Full | ✅ Full | `expo-sms` |
| Background Location | ✅ Full | ⚠️ Limited | Platform-specific config |
| Face ID / Fingerprint | ✅ Face ID | ✅ Fingerprint | Platform-specific |
| Shortcuts Integration | ✅ iOS Only | ❌ N/A | iOS-specific feature |
| Widgets | ✅ Full | ✅ Full | Both platforms |

### Using PlatformUtils
```typescript
import { PlatformUtils } from '../utils/PlatformUtils';

// Check platform-specific capabilities
if (PlatformUtils.nfcConfig.backgroundReadingSupported) {
  // Enable background NFC reading (iOS only)
}

// Use platform-specific configurations
const qrFormats = PlatformUtils.cameraConfig.barcodeFormats;
```

## 🧪 Testing Strategy

### Continuous Compatibility Testing
1. **Every Major Feature**: Test on both platforms
2. **Weekly iOS Builds**: Once developer account is ready
3. **Shared Component Updates**: Verify on both platforms
4. **Performance Testing**: Both platforms have different performance characteristics

### Device Testing Priority
1. **Primary**: Android device (daily development)
2. **Secondary**: iPhone 16 Pro Max (weekly verification)
3. **Simulators**: For quick UI/layout testing

## 🚀 Build Strategy

### Development Builds
```bash
# Android development build
npm run build:android

# iOS development build (once developer account ready)
npm run build:ios
```

### Deployment Strategy
1. **Android First**: Deploy and test features on Android
2. **iOS Verification**: Ensure compatibility and test iOS-specific features
3. **Simultaneous Release**: Deploy to both platforms together

## 📝 Code Organization Best Practices

### Keep Platform-Agnostic
- ✅ **Business Logic**: Keep in shared services
- ✅ **State Management**: Redux works identically on both
- ✅ **API Calls**: Same endpoints and responses
- ✅ **Components**: Use React Native components that work on both

### Handle Platform Differences
- ✅ **Use PlatformUtils**: For platform-specific behavior
- ✅ **Conditional Rendering**: `Platform.OS === 'ios'` when needed
- ✅ **Feature Flags**: Enable/disable features per platform
- ✅ **Styling**: Use `Platform.select()` for platform-specific styles

### Example Component Structure
```typescript
import { PlatformUtils } from '../utils/PlatformUtils';

export const AutomationCard = () => {
  return (
    <View style={[
      styles.card,
      PlatformUtils.isIOS && styles.iosCard,
      PlatformUtils.isAndroid && styles.androidCard
    ]}>
      {/* Shared content */}
      {PlatformUtils.features.shortcuts && (
        <ShortcutsIntegrationButton />
      )}
    </View>
  );
};
```

## 🔧 Configuration Management

### Environment Variables
```bash
# Shared across platforms
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key

# Platform-specific if needed
IOS_SPECIFIC_CONFIG=value
ANDROID_SPECIFIC_CONFIG=value
```

### Build Configurations
- **Development**: Both platforms with debug features
- **Staging**: Test builds for both platforms
- **Production**: Release builds for app stores

## 📊 Development Priorities

### Phase 1: Android Focus (Current)
- ✅ Develop core features on Android
- ✅ Test automation engine
- ✅ Implement NFC functionality
- ✅ Build UI/UX

### Phase 2: iOS Integration (Once developer account ready)
- ⏳ Test all features on iOS
- ⏳ Add iOS-specific features (Shortcuts integration)
- ⏳ Optimize for iOS UI patterns
- ⏳ Set up iOS App Store deployment

### Phase 3: Platform Optimization
- ⏳ Performance optimization for both platforms
- ⏳ Platform-specific UI enhancements
- ⏳ Advanced features (widgets, extensions)

## 🎯 Success Metrics
- ✅ Feature parity: 95%+ of features work on both platforms
- ✅ Shared codebase: 90%+ code reuse between platforms
- ✅ Development efficiency: Single codebase, dual deployment
- ✅ User experience: Native feel on both platforms

This approach ensures that your Android development progress automatically benefits iOS, while maintaining platform-specific optimizations where needed.