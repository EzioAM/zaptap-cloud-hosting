// Check if React Native Skia is available at runtime
let isSkiaAvailable = false;
try {
  // Try to import Skia to check if it's available
  const testSkia = require('@shopify/react-native-skia');
  isSkiaAvailable = !!testSkia;
  console.log('[PremiumConfig] React Native Skia is available');
} catch (error) {
  console.log('[PremiumConfig] React Native Skia not available - using fallback effects');
  isSkiaAvailable = false;
}

// Configuration for premium features and rendering
export const PremiumConfig = {
  // Weather Effects Configuration
  weather: {
    // Enable Skia-based premium rendering (requires @shopify/react-native-skia)
    usePremiumEffects: isSkiaAvailable, // Automatically disabled if Skia not available
    
    // Enable WebGPU acceleration (experimental)
    useWebGPU: false,
    
    // Performance settings
    targetFPS: 120,
    particleCount: {
      rain: 150,
      snow: 100,
      stars: 120,
    },
    
    // Quality settings
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    
    // Enable interactive features
    enableTouch: true,
    enableCondensation: true,
    enableLightning: true,
    enableRefraction: true,
  },
  
  // IoT Integration Configuration
  iot: {
    // Enable IoT features
    enabled: true,
    
    // Supported protocols
    protocols: {
      matter: true,
      homekit: true,
      zigbee: true,
      thread: true,
      zwave: false,
    },
    
    // Cloud providers
    cloud: {
      aws: false,
      azure: false,
      google: false,
      custom: false,
    },
    
    // Discovery settings
    discovery: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
    },
    
    // Security
    encryption: true,
    localOnly: false,
  },
  
  // Performance Optimizations
  performance: {
    // Use GPU acceleration
    useGPU: true,
    
    // Cache settings
    cacheSize: 100, // MB
    cacheDuration: 86400000, // 24 hours
    
    // Lazy loading
    lazyLoad: true,
    
    // Background processing
    backgroundProcessing: true,
  },
  
  // Analytics Configuration
  analytics: {
    enabled: true,
    trackPerformance: true,
    trackErrors: true,
    trackUsage: true,
  },
  
  // Feature Flags
  features: {
    // Premium weather effects with Skia
    premiumWeather: true,
    
    // IoT device integration
    iotIntegration: true,
    
    // Machine learning predictions
    mlPredictions: false,
    
    // Voice control
    voiceControl: false,
    
    // Advanced automations
    advancedAutomations: true,
    
    // Cloud sync
    cloudSync: true,
    
    // Offline mode
    offlineMode: true,
    
    // Beta features
    beta: {
      webGPU: false,
      skiaGraphite: false,
      tensorflowLite: false,
    },
  },
};

// Helper function to check if premium features are available
export const isPremiumFeatureAvailable = (feature: keyof typeof PremiumConfig.features): boolean => {
  // Special handling for premium weather - check if Skia is actually available
  if (feature === 'premiumWeather') {
    return PremiumConfig.features[feature] === true && isSkiaAvailable;
  }
  return PremiumConfig.features[feature] === true;
};

// Check if Skia is available at runtime
export const isSkiaModuleAvailable = (): boolean => {
  return isSkiaAvailable;
};

// Force enable/disable premium effects (for testing)
export const setPremiumEffectsEnabled = (enabled: boolean) => {
  if (enabled && !isSkiaAvailable) {
    console.warn('[PremiumConfig] Cannot enable premium effects - React Native Skia not available');
    return false;
  }
  PremiumConfig.weather.usePremiumEffects = enabled;
  return true;
};

// Helper function to get weather quality settings
export const getWeatherQualitySettings = () => {
  const quality = PremiumConfig.weather.quality;
  
  switch (quality) {
    case 'ultra':
      return {
        particleMultiplier: 1.5,
        shaderQuality: 'high',
        blurEnabled: true,
        refractionEnabled: true,
        shadowsEnabled: true,
      };
    case 'high':
      return {
        particleMultiplier: 1.0,
        shaderQuality: 'high',
        blurEnabled: true,
        refractionEnabled: true,
        shadowsEnabled: false,
      };
    case 'medium':
      return {
        particleMultiplier: 0.7,
        shaderQuality: 'medium',
        blurEnabled: true,
        refractionEnabled: false,
        shadowsEnabled: false,
      };
    case 'low':
      return {
        particleMultiplier: 0.4,
        shaderQuality: 'low',
        blurEnabled: false,
        refractionEnabled: false,
        shadowsEnabled: false,
      };
    default:
      return {
        particleMultiplier: 0.7,
        shaderQuality: 'medium',
        blurEnabled: true,
        refractionEnabled: false,
        shadowsEnabled: false,
      };
  }
};

// Export default config
export default PremiumConfig;