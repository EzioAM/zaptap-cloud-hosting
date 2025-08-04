import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

type SoundType = 'success' | 'error' | 'tap' | 'notification' | 'swipe';

interface SoundConfig {
  volume?: number;
  rate?: number;
  shouldPlay?: boolean;
}

// Sound file mappings (you'll need to add actual sound files to assets/sounds/)
const SOUND_FILES: Record<SoundType, string> = {
  success: 'success.mp3',
  error: 'error.mp3',
  tap: 'tap.mp3',
  notification: 'notification.mp3',
  swipe: 'swipe.mp3',
};

export const useSound = (enabled: boolean = true) => {
  const soundObjects = useRef<Record<string, Audio.Sound>>({});
  
  useEffect(() => {
    // Configure audio session
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.error('Failed to setup audio:', error);
      }
    };
    
    setupAudio();
    
    // Cleanup
    return () => {
      Object.values(soundObjects.current).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error('Failed to unload sound:', error);
        }
      });
    };
  }, []);
  
  const playSound = useCallback(
    async (type: SoundType, config?: SoundConfig) => {
      if (!enabled) return;
      
      try {
        const soundFile = SOUND_FILES[type];
        if (!soundFile) {
          console.warn(`Sound type "${type}" not found`);
          return;
        }
        
        let sound = soundObjects.current[type];
        
        // Load sound if not already loaded
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            // In a real app, you'd import these files properly
            // For now, we'll use placeholder URIs
            { uri: `https://example.com/sounds/${soundFile}` },
            { shouldPlay: false }
          );
          soundObjects.current[type] = newSound;
          sound = newSound;
        }
        
        // Configure sound
        if (config?.volume !== undefined) {
          await sound.setVolumeAsync(config.volume);
        }
        if (config?.rate !== undefined) {
          await sound.setRateAsync(config.rate, true);
        }
        
        // Play sound
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        console.error(`Failed to play sound "${type}":`, error);
      }
    },
    [enabled]
  );
  
  return { playSound };
};

// Pre-configured sound hooks for common use cases
export const useSuccessSound = (enabled: boolean = true) => {
  const { playSound } = useSound(enabled);
  return useCallback(() => playSound('success', { volume: 0.5 }), [playSound]);
};

export const useErrorSound = (enabled: boolean = true) => {
  const { playSound } = useSound(enabled);
  return useCallback(() => playSound('error', { volume: 0.6 }), [playSound]);
};

export const useTapSound = (enabled: boolean = true) => {
  const { playSound } = useSound(enabled);
  return useCallback(() => playSound('tap', { volume: 0.3, rate: 1.1 }), [playSound]);
};

export const useNotificationSound = (enabled: boolean = true) => {
  const { playSound } = useSound(enabled);
  return useCallback(() => playSound('notification', { volume: 0.7 }), [playSound]);
};

// Example of integrating with existing haptic hook
export const useSoundAndHaptic = (soundEnabled: boolean = true) => {
  const { playSound } = useSound(soundEnabled);
  
  const trigger = useCallback(
    async (type: 'success' | 'error' | 'light' | 'warning') => {
      // Map haptic types to sounds
      const soundMap: Record<string, SoundType> = {
        success: 'success',
        error: 'error',
        light: 'tap',
        warning: 'notification',
      };
      
      const soundType = soundMap[type];
      if (soundType) {
        await playSound(soundType);
      }
      
      // You'd also trigger haptic feedback here
      // hapticTrigger(type);
    },
    [playSound]
  );
  
  return { trigger };
};