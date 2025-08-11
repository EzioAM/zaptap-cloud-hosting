# Sound Effects Implementation Guide

## 🔊 Sound System Overview

A flexible sound system has been created using Expo AV with the following features:
- **Multiple sound types**: Success, error, tap, notification, swipe
- **Configurable**: Volume and playback rate control
- **Optimized**: Sounds are cached after first play
- **Silent mode aware**: Respects device settings

## 📁 Setup

### 1. Install Dependencies
```bash
expo install expo-av
```

### 2. Add Sound Files
Create a `sounds` directory in your assets folder:
```
assets/
└── sounds/
    ├── success.mp3    # Positive completion sound
    ├── error.mp3      # Error/failure sound
    ├── tap.mp3        # Light tap/click sound
    ├── notification.mp3 # Alert sound
    └── swipe.mp3      # Swipe/transition sound
```

### 3. Update Metro Config
Add audio file support to `metro.config.js`:
```javascript
module.exports = {
  resolver: {
    assetExts: [...defaultAssetExts, 'mp3', 'wav', 'm4a'],
  },
};
```

## 🎵 Usage Examples

### Basic Sound Hook
```typescript
import { useSound } from '@/hooks/useSound';

function MyComponent() {
  const { playSound } = useSound();
  
  const handleSuccess = async () => {
    await playSound('success');
  };
  
  const handleError = async () => {
    await playSound('error', { volume: 0.8 });
  };
}
```

### Pre-configured Hooks
```typescript
import { useSuccessSound, useErrorSound, useTapSound } from '@/hooks/useSound';

function MyButton() {
  const playTap = useTapSound();
  
  return (
    <TouchableOpacity onPress={() => {
      playTap();
      // Your action
    }}>
      <Text>Click me</Text>
    </TouchableOpacity>
  );
}
```

### Integrating with Existing Components

#### Update Button Component
```typescript
// In Button.tsx
import { useTapSound } from '@/hooks/useSound';
import { useHaptic } from '@/hooks/useHaptic';

export const Button: React.FC<ButtonProps> = ({ onPress, enableSound = true, ... }) => {
  const playTap = useTapSound(enableSound);
  const { trigger } = useHaptic();
  
  const handlePress = () => {
    if (!disabled) {
      playTap();
      trigger('light');
      onPress();
    }
  };
  
  // Rest of component
};
```

#### Update Automation Execution
```typescript
// In AutomationEngine
import { useSuccessSound, useErrorSound } from '@/hooks/useSound';

const playSuccess = useSuccessSound();
const playError = useErrorSound();

// After execution
if (result.success) {
  playSuccess();
} else {
  playError();
}
```

## 🎨 Sound Design Guidelines

### Sound Types and Use Cases

1. **Success** (success.mp3)
   - Automation completed successfully
   - Form submitted
   - Action confirmed
   - Duration: 0.3-0.5s
   - Tone: Bright, ascending

2. **Error** (error.mp3)
   - Automation failed
   - Validation error
   - Connection lost
   - Duration: 0.4-0.6s
   - Tone: Low, descending

3. **Tap** (tap.mp3)
   - Button press
   - Toggle switch
   - Selection
   - Duration: 0.05-0.1s
   - Tone: Subtle click

4. **Notification** (notification.mp3)
   - New activity
   - Alert
   - Reminder
   - Duration: 0.5-0.8s
   - Tone: Pleasant chime

5. **Swipe** (swipe.mp3)
   - Navigation transition
   - Card swipe
   - Dismiss action
   - Duration: 0.2-0.3s
   - Tone: Swoosh effect

## 🔧 Advanced Configuration

### Global Sound Settings
```typescript
// In App.tsx or settings context
const [soundEnabled, setSoundEnabled] = useState(true);

<SoundContext.Provider value={{ enabled: soundEnabled }}>
  {/* Your app */}
</SoundContext.Provider>
```

### User Preferences
```typescript
// In SettingsScreen
<View>
  <Text>Sound Effects</Text>
  <Switch
    value={soundEnabled}
    onValueChange={setSoundEnabled}
  />
</View>
```

## 📱 Platform Considerations

### iOS
- Sounds play in silent mode by default (configurable)
- Supports formats: mp3, m4a, wav, aiff

### Android
- Respects system sound settings
- Audio ducking enabled (lowers other app volumes)
- Supports formats: mp3, wav, ogg, m4a

## 🎯 Best Practices

1. **Keep sounds short** - UI sounds should be under 1 second
2. **Consistent volume** - Normalize all sounds to similar levels
3. **Subtle by default** - UI sounds should enhance, not distract
4. **Respect user settings** - Always provide option to disable
5. **Test on device** - Sounds may vary between simulator and device

## 🚀 Next Steps

1. **Source/create sound files** - Use royalty-free sources or create custom
2. **Implement in key interactions** - Start with buttons and success/error states
3. **Add settings toggle** - Let users control sound preferences
4. **Test across devices** - Ensure consistent experience

## 📚 Resources

- [Freesound.org](https://freesound.org/) - Free sound effects
- [Zapsplat](https://www.zapsplat.com/) - Free sound library
- [UI Sounds](https://uisounds.net/) - Curated UI sound effects
- [Expo AV Docs](https://docs.expo.dev/versions/latest/sdk/av/) - Official documentation