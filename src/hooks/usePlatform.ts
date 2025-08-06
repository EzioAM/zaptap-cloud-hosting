import { Platform, Dimensions } from 'react-native';
import { useMemo } from 'react';

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  version: number | undefined;
  supportsHaptics: boolean;
  supportsGestures: boolean;
  supportsBlur: boolean;
  supportsStatusBar: boolean;
}

export interface PlatformConstants {
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    full: number;
  };
  elevation: {
    low: number;
    medium: number;
    high: number;
  };
  shadows: {
    ios: {
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
    };
    android: {
      elevation: number;
    };
    web: {
      boxShadow: string;
    };
  };
  animations: {
    scale: number;
    duration: number;
    easing: string;
  };
  spacing: {
    touch: number;
    gesture: number;
  };
}

const getPlatformConstants = (platform: PlatformInfo): PlatformConstants => {
  const base: PlatformConstants = {
    borderRadius: {
      small: 4,
      medium: 8,
      large: 16,
      full: 9999,
    },
    elevation: {
      low: 2,
      medium: 4,
      high: 8,
    },
    shadows: {
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    },
    animations: {
      scale: 0.95,
      duration: 200,
      easing: 'ease-out',
    },
    spacing: {
      touch: 44,
      gesture: 20,
    },
  };

  // Platform-specific overrides
  if (platform.isIOS) {
    return {
      ...base,
      borderRadius: {
        small: 8,
        medium: 12,
        large: 20,
        full: 9999,
      },
      shadows: {
        ...base.shadows,
        ios: {
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 1.0,
        },
      },
      animations: {
        scale: 0.97,
        duration: 150,
        easing: 'ease-out',
      },
    };
  }

  if (platform.isAndroid) {
    return {
      ...base,
      borderRadius: {
        small: 4,
        medium: 8,
        large: 16,
        full: 9999,
      },
      elevation: {
        low: 1,
        medium: 3,
        high: 6,
      },
      animations: {
        scale: 0.95,
        duration: 200,
        easing: 'ease-out',
      },
    };
  }

  // Web defaults
  return {
    ...base,
    borderRadius: {
      small: 6,
      medium: 8,
      large: 12,
      full: 9999,
    },
    shadows: {
      ...base.shadows,
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      },
    },
    animations: {
      scale: 0.98,
      duration: 150,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
  };
};

export const usePlatform = () => {
  const platformInfo = useMemo((): PlatformInfo => {
    const { width, height } = Dimensions.get('window');
    const isTablet = Math.min(width, height) > 600;
    
    const info: PlatformInfo = {
      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
      isWeb: Platform.OS === 'web',
      isMobile: Platform.OS !== 'web',
      isTablet,
      version: typeof Platform.Version === 'number' ? Platform.Version : undefined,
      supportsHaptics: Platform.OS === 'ios' || Platform.OS === 'android',
      supportsGestures: Platform.OS === 'ios' || Platform.OS === 'android',
      supportsBlur: Platform.OS === 'ios',
      supportsStatusBar: Platform.OS !== 'web',
    };

    return info;
  }, []);

  const constants = useMemo(() => getPlatformConstants(platformInfo), [platformInfo]);

  const select = useMemo(() => {
    return <T>(selections: {
      ios?: T;
      android?: T;
      web?: T;
      mobile?: T;
      default: T;
    }): T => {
      if (platformInfo.isIOS && selections.ios !== undefined) {
        return selections.ios;
      }
      if (platformInfo.isAndroid && selections.android !== undefined) {
        return selections.android;
      }
      if (platformInfo.isWeb && selections.web !== undefined) {
        return selections.web;
      }
      if (platformInfo.isMobile && selections.mobile !== undefined) {
        return selections.mobile;
      }
      return selections.default;
    };
  }, [platformInfo]);

  const getShadowStyle = useMemo(() => {
    return (elevation: 'low' | 'medium' | 'high' = 'medium') => {
      if (platformInfo.isIOS) {
        const shadowConfig = constants.shadows.ios;
        const elevationMultiplier = {
          low: 0.5,
          medium: 1,
          high: 2,
        }[elevation];

        return {
          shadowOffset: {
            width: shadowConfig.shadowOffset.width,
            height: shadowConfig.shadowOffset.height * elevationMultiplier,
          },
          shadowOpacity: shadowConfig.shadowOpacity,
          shadowRadius: shadowConfig.shadowRadius * elevationMultiplier,
          shadowColor: '#000',
        };
      }

      if (platformInfo.isAndroid) {
        return {
          elevation: constants.elevation[elevation],
        };
      }

      // Web fallback
      const shadows = {
        low: '0 1px 3px rgba(0, 0, 0, 0.1)',
        medium: '0 2px 8px rgba(0, 0, 0, 0.1)',
        high: '0 4px 16px rgba(0, 0, 0, 0.15)',
      };

      return {
        boxShadow: shadows[elevation],
      };
    };
  }, [platformInfo, constants]);

  const getHitSlop = useMemo(() => {
    return (size: 'small' | 'medium' | 'large' = 'medium') => {
      const base = constants.spacing.touch;
      const multipliers = { small: 0.5, medium: 1, large: 1.5 };
      const hitSlop = base * multipliers[size];

      return {
        top: hitSlop,
        bottom: hitSlop,
        left: hitSlop,
        right: hitSlop,
      };
    };
  }, [constants]);

  return {
    ...platformInfo,
    constants,
    select,
    getShadowStyle,
    getHitSlop,
  };
};