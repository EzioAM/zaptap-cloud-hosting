import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WeatherEffects from './WeatherEffects';
import { EventLogger } from '../../utils/EventLogger';

// Type definitions for props
interface SkiaWeatherEffectsProps {
  condition: 'rain' | 'snow' | 'clear' | 'clouds' | 'thunderstorm' | 'drizzle';
  intensity?: number;
  temperature?: number;
  windSpeed?: number;
  isDay?: boolean;
  onTouch?: (x: number, y: number) => void;
}

interface CompatibilityWrapperProps extends SkiaWeatherEffectsProps {
  children?: React.ReactNode;
}

// Lazy load check for Skia availability
let SkiaModule: any = null;
let PremiumEffectsComponent: React.ComponentType<SkiaWeatherEffectsProps> | null = null;
let skiaCheckComplete = false;
let skiaAvailable = false;

const checkSkiaAvailability = async (): Promise<boolean> => {
  if (skiaCheckComplete) {
    return skiaAvailable;
  }

  try {
    // Try to load Skia module
    SkiaModule = require('@shopify/react-native-skia');
    
    // Try to load premium effects component
    const premiumModule = require('./PremiumWeatherEffects');
    PremiumEffectsComponent = premiumModule.PremiumWeatherEffects;
    
    skiaAvailable = !!(SkiaModule && PremiumEffectsComponent);
    EventLogger.info('SkiaWrapper', `Skia availability: ${skiaAvailable}`);
  } catch (error) {
    EventLogger.warn('SkiaWrapper', 'Skia module not available, using fallback', error as Error);
    skiaAvailable = false;
  }
  
  skiaCheckComplete = true;
  return skiaAvailable;
};

/**
 * Compatibility wrapper that safely handles React Native Skia availability
 * Falls back to standard effects if Skia is not available
 */
export const SkiaCompatibilityWrapper: React.FC<CompatibilityWrapperProps> = (props) => {
  const [isSkiaReady, setIsSkiaReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const initializeSkia = async () => {
      setIsChecking(true);
      const available = await checkSkiaAvailability();
      setIsSkiaReady(available);
      setIsChecking(false);
    };
    
    initializeSkia();
  }, []);
  
  // Don't render anything while checking
  if (isChecking) {
    return (
      <View style={styles.container}>
        <WeatherEffects 
          condition={props.condition}
          isDay={props.isDay ?? true}
          intensity={props.intensity ?? 0.5}
        />
      </View>
    );
  }
  
  // Render premium effects if available
  if (isSkiaReady && PremiumEffectsComponent) {
    return (
      <View style={styles.container}>
        <PremiumEffectsComponent {...props} />
      </View>
    );
  }
  
  // Fallback to standard effects
  return (
    <View style={styles.container}>
      <WeatherEffects 
        condition={props.condition}
        isDay={props.isDay ?? true}
        intensity={props.intensity ?? 0.5}
      />
    </View>
  );
};

/**
 * Hook to check if Skia is available
 */
export const useSkiaAvailability = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    checkSkiaAvailability().then(available => {
      setIsAvailable(available);
      setIsLoading(false);
    });
  }, []);
  
  return { isAvailable, isLoading };
};

/**
 * HOC to wrap components that depend on Skia
 */
export function withSkiaFallback<P extends object>(
  SkiaComponent: React.ComponentType<P>,
  FallbackComponent: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    const { isAvailable, isLoading } = useSkiaAvailability();
    
    if (isLoading) {
      return <FallbackComponent {...props} />;
    }
    
    if (isAvailable) {
      try {
        return <SkiaComponent {...props} />;
      } catch (error) {
        EventLogger.error('SkiaWrapper', 'Error rendering Skia component', error as Error);
        return <FallbackComponent {...props} />;
      }
    }
    
    return <FallbackComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SkiaCompatibilityWrapper;