/**
 * Gradient System for ZapTap
 * Premium gradient definitions and utilities
 */

import { Platform } from 'react-native';

export interface GradientDefinition {
  colors: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  angle?: number; // For CSS linear-gradient
}

export interface GradientSystem {
  primary: GradientDefinition;
  secondary: GradientDefinition;
  success: GradientDefinition;
  warning: GradientDefinition;
  error: GradientDefinition;
  premium: GradientDefinition;
  dark: GradientDefinition;
  light: GradientDefinition;
  aurora: GradientDefinition;
  sunset: GradientDefinition;
  ocean: GradientDefinition;
  forest: GradientDefinition;
  fire: GradientDefinition;
  cosmic: GradientDefinition;
  rainbow: GradientDefinition;
}

// Core gradient definitions
export const gradients: GradientSystem = {
  primary: {
    colors: ['#6366F1', '#8B5CF6', '#EC4899'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  },
  secondary: {
    colors: ['#EC4899', '#F472B6', '#F9A8D4'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  },
  success: {
    colors: ['#10B981', '#34D399', '#3B82F6'],
    locations: [0, 0.6, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  },
  warning: {
    colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  },
  error: {
    colors: ['#EF4444', '#F87171', '#DC2626'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  },
  premium: {
    colors: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'],
    locations: [0, 0.33, 0.66, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 45,
  },
  dark: {
    colors: ['#1F2937', '#111827', '#000000'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  light: {
    colors: ['#FFFFFF', '#F9FAFB', '#F3F4F6'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  aurora: {
    colors: ['#00F5FF', '#00E4FF', '#7DF9FF', '#B4F8FF', '#00CED1'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 45,
  },
  sunset: {
    colors: ['#FFA726', '#FF7043', '#FF5722', '#E91E63', '#9C27B0'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  ocean: {
    colors: ['#006994', '#0099CC', '#00B4D8', '#48CAE4', '#90E0EF'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  },
  forest: {
    colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  },
  fire: {
    colors: ['#FF0000', '#FF4500', '#FF6347', '#FF7F50', '#FFA500'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    angle: 0,
  },
  cosmic: {
    colors: ['#000428', '#004E92', '#7209B7', '#C77DFF', '#E0AAFF'],
    locations: [0, 0.25, 0.5, 0.75, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 45,
  },
  rainbow: {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    locations: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  },
};

// Subtle gradients for backgrounds
export const subtleGradients = {
  lightGray: {
    colors: ['#F9FAFB', '#F3F4F6', '#E5E7EB'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  lightBlue: {
    colors: ['#EFF6FF', '#DBEAFE', '#BFDBFE'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  lightPurple: {
    colors: ['#F3E8FF', '#E9D5FF', '#D8B4FE'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
  lightPink: {
    colors: ['#FCE7F3', '#FBCFE8', '#F9A8D4'],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    angle: 180,
  },
};

// Glassmorphism effects
export const glassEffects = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
  },
  medium: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
  },
  strong: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(16px)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
  },
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  darkMedium: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
  },
  darkStrong: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(16px)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
  },
  colorful: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(12px) saturate(200%)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
  },
};

// Helper function to safely get gradient colors
export const getSafeGradientColors = (gradient: GradientDefinition | undefined | null, fallback?: string[]): string[] => {
  if (!gradient || !gradient.colors || gradient.colors.length < 2) {
    return fallback || ['#6366F1', '#8B5CF6'];
  }
  return gradient.colors;
};

// Utility functions
export const getGradientStyle = (gradient: GradientDefinition, forWeb = false) => {
  if (forWeb || Platform.OS === 'web') {
    // Return CSS gradient string
    const angle = gradient.angle || 135;
    const colorStops = gradient.colors
      .map((color, index) => {
        const location = gradient.locations?.[index] || index / (gradient.colors.length - 1);
        return `${color} ${location * 100}%`;
      })
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  }
  
  // Return object for React Native LinearGradient
  return {
    colors: gradient.colors,
    locations: gradient.locations,
    start: gradient.start || { x: 0, y: 0 },
    end: gradient.end || { x: 1, y: 1 },
  };
};

// Get glassmorphism styles for platform
export const getGlassStyle = (effect: keyof typeof glassEffects, isDark = false) => {
  const glass = isDark && effect.startsWith('dark') ? glassEffects[effect] : 
                isDark ? glassEffects[`dark${effect.charAt(0).toUpperCase() + effect.slice(1)}` as keyof typeof glassEffects] || glassEffects[effect] :
                glassEffects[effect];
  
  if (Platform.OS === 'web') {
    return {
      backgroundColor: glass.backgroundColor,
      backdropFilter: glass.backdropFilter,
      WebkitBackdropFilter: glass.backdropFilter,
      borderColor: glass.borderColor,
      borderWidth: glass.borderWidth,
    };
  }
  
  // For React Native, we can't use backdrop-filter directly
  // Return styles that work with BlurView or similar
  return {
    backgroundColor: glass.backgroundColor,
    borderColor: glass.borderColor,
    borderWidth: glass.borderWidth,
    overflow: 'hidden' as const,
  };
};

// Animated gradient helper
export const getAnimatedGradient = (from: GradientDefinition, to: GradientDefinition, progress: number): GradientDefinition => {
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    // Simple color interpolation (could be enhanced with proper color space conversion)
    const hex2rgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      } : { r: 0, g: 0, b: 0 };
    };
    
    const rgb2hex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };
    
    const c1 = hex2rgb(color1);
    const c2 = hex2rgb(color2);
    
    const r = c1.r + (c2.r - c1.r) * factor;
    const g = c1.g + (c2.g - c1.g) * factor;
    const b = c1.b + (c2.b - c1.b) * factor;
    
    return rgb2hex(r, g, b);
  };
  
  const maxColors = Math.max(from.colors.length, to.colors.length);
  const colors: string[] = [];
  
  for (let i = 0; i < maxColors; i++) {
    const fromColor = from.colors[Math.min(i, from.colors.length - 1)];
    const toColor = to.colors[Math.min(i, to.colors.length - 1)];
    colors.push(interpolateColor(fromColor, toColor, progress));
  }
  
  return {
    colors,
    locations: from.locations || to.locations,
    start: from.start || to.start,
    end: from.end || to.end,
    angle: from.angle || to.angle,
  };
};

// Mesh gradient for complex backgrounds
export const meshGradients = {
  vibrant: {
    colors: [
      { color: '#FF006E', position: { x: 0.1, y: 0.1 }, radius: 0.4 },
      { color: '#FB5607', position: { x: 0.9, y: 0.2 }, radius: 0.3 },
      { color: '#FFBE0B', position: { x: 0.8, y: 0.8 }, radius: 0.35 },
      { color: '#8338EC', position: { x: 0.2, y: 0.7 }, radius: 0.45 },
      { color: '#3A86FF', position: { x: 0.5, y: 0.5 }, radius: 0.5 },
    ],
  },
  calm: {
    colors: [
      { color: '#A8DADC', position: { x: 0.2, y: 0.2 }, radius: 0.4 },
      { color: '#457B9D', position: { x: 0.8, y: 0.3 }, radius: 0.35 },
      { color: '#1D3557', position: { x: 0.5, y: 0.8 }, radius: 0.3 },
      { color: '#F1FAEE', position: { x: 0.3, y: 0.6 }, radius: 0.45 },
    ],
  },
  warm: {
    colors: [
      { color: '#FFCDB2', position: { x: 0.1, y: 0.3 }, radius: 0.4 },
      { color: '#FFB4A2', position: { x: 0.7, y: 0.2 }, radius: 0.35 },
      { color: '#E5989B', position: { x: 0.8, y: 0.7 }, radius: 0.3 },
      { color: '#B5838D', position: { x: 0.3, y: 0.8 }, radius: 0.45 },
      { color: '#6D6875', position: { x: 0.5, y: 0.5 }, radius: 0.4 },
    ],
  },
};

export default gradients;