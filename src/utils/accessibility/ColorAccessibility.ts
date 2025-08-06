/**
 * Color Accessibility Utilities
 * WCAG 2.1 AA/AAA compliant color contrast validation and adjustment
 */

import { ColorScheme } from '../../theme/colors';

// WCAG color contrast standards
export const WCAG_STANDARDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

export type WCAGLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

// Color conversion utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const parseColor = (color: string): { r: number; g: number; b: number } => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    if (rgb) return rgb;
  }
  
  // Handle rgba colors
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
    };
  }
  
  // Handle named colors (basic set)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    transparent: { r: 255, g: 255, b: 255 }, // Fallback for transparent
  };
  
  return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0 };
};

// Calculate relative luminance
export const getRelativeLuminance = (color: string): number => {
  const { r, g, b } = parseColor(color);
  
  const sRGBToLinear = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.03928 
      ? normalized / 12.92 
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  
  const rLinear = sRGBToLinear(r);
  const gLinear = sRGBToLinear(g);
  const bLinear = sRGBToLinear(b);
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

// Calculate contrast ratio between two colors
export const getContrastRatio = (foreground: string, background: string): number => {
  const luminance1 = getRelativeLuminance(foreground);
  const luminance2 = getRelativeLuminance(background);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Check if color combination meets WCAG standards
export const meetsWCAGStandard = (
  foreground: string,
  background: string,
  level: WCAGLevel = 'AA',
  textSize: TextSize = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return textSize === 'large' 
      ? ratio >= WCAG_STANDARDS.AAA_LARGE
      : ratio >= WCAG_STANDARDS.AAA_NORMAL;
  }
  
  return textSize === 'large'
    ? ratio >= WCAG_STANDARDS.AA_LARGE
    : ratio >= WCAG_STANDARDS.AA_NORMAL;
};

// Adjust color brightness to meet contrast requirements
export const adjustColorForContrast = (
  foreground: string,
  background: string,
  level: WCAGLevel = 'AA',
  textSize: TextSize = 'normal',
  adjustForeground: boolean = true
): string => {
  const targetRatio = level === 'AAA'
    ? (textSize === 'large' ? WCAG_STANDARDS.AAA_LARGE : WCAG_STANDARDS.AAA_NORMAL)
    : (textSize === 'large' ? WCAG_STANDARDS.AA_LARGE : WCAG_STANDARDS.AA_NORMAL);
  
  const currentRatio = getContrastRatio(foreground, background);
  
  if (currentRatio >= targetRatio) {
    return foreground; // Already meets standard
  }
  
  const colorToAdjust = adjustForeground ? foreground : background;
  const { r, g, b } = parseColor(colorToAdjust);
  
  // Determine if we need to make the color lighter or darker
  const backgroundLuminance = getRelativeLuminance(background);
  const shouldLighten = adjustForeground 
    ? backgroundLuminance < 0.5 
    : backgroundLuminance >= 0.5;
  
  let adjustedR = r;
  let adjustedG = g;
  let adjustedB = b;
  
  // Binary search for the right adjustment
  let step = shouldLighten ? 1 : -1;
  let iterations = 0;
  const maxIterations = 255;
  
  while (iterations < maxIterations) {
    const testColor = rgbToHex(
      Math.max(0, Math.min(255, adjustedR)),
      Math.max(0, Math.min(255, adjustedG)),
      Math.max(0, Math.min(255, adjustedB))
    );
    
    const testRatio = adjustForeground
      ? getContrastRatio(testColor, background)
      : getContrastRatio(foreground, testColor);
    
    if (testRatio >= targetRatio) {
      return testColor;
    }
    
    // Adjust all channels equally
    adjustedR += step * 5;
    adjustedG += step * 5;
    adjustedB += step * 5;
    
    // Check bounds
    if (shouldLighten && (adjustedR >= 255 && adjustedG >= 255 && adjustedB >= 255)) {
      break;
    }
    if (!shouldLighten && (adjustedR <= 0 && adjustedG <= 0 && adjustedB <= 0)) {
      break;
    }
    
    iterations++;
  }
  
  // If we couldn't achieve the target ratio, return the best attempt
  return rgbToHex(
    Math.max(0, Math.min(255, adjustedR)),
    Math.max(0, Math.min(255, adjustedG)),
    Math.max(0, Math.min(255, adjustedB))
  );
};

// Generate accessible color variations
export const generateAccessibleColors = (
  baseColor: string,
  backgrounds: string[],
  level: WCAGLevel = 'AA'
): Record<string, string> => {
  const variations: Record<string, string> = {};
  
  backgrounds.forEach((bg, index) => {
    const key = `onBackground${index + 1}`;
    variations[key] = adjustColorForContrast(baseColor, bg, level, 'normal', true);
  });
  
  return variations;
};

// Validate entire color scheme for accessibility
export const validateColorScheme = (
  colors: ColorScheme,
  level: WCAGLevel = 'AA'
): {
  isValid: boolean;
  issues: Array<{
    combination: string;
    ratio: number;
    required: number;
    severity: 'warning' | 'error';
  }>;
  suggestions: Record<string, string>;
} => {
  const issues: Array<{
    combination: string;
    ratio: number;
    required: number;
    severity: 'warning' | 'error';
  }> = [];
  
  const suggestions: Record<string, string> = {};
  
  // Test common color combinations
  const testCombinations = [
    { fg: colors.text.primary, bg: colors.background.primary, name: 'Primary text on primary background' },
    { fg: colors.text.secondary, bg: colors.background.primary, name: 'Secondary text on primary background' },
    { fg: colors.text.primary, bg: colors.surface.primary, name: 'Primary text on surface' },
    { fg: colors.text.inverse, bg: colors.brand.primary, name: 'Inverse text on brand primary' },
    { fg: colors.text.primary, bg: colors.surface.elevated, name: 'Primary text on elevated surface' },
  ];
  
  testCombinations.forEach(({ fg, bg, name }) => {
    const ratio = getContrastRatio(fg, bg);
    const required = level === 'AAA' ? WCAG_STANDARDS.AAA_NORMAL : WCAG_STANDARDS.AA_NORMAL;
    
    if (ratio < required) {
      const severity = ratio < WCAG_STANDARDS.AA_LARGE ? 'error' : 'warning';
      issues.push({
        combination: name,
        ratio,
        required,
        severity,
      });
      
      // Generate suggestion
      suggestions[name] = adjustColorForContrast(fg, bg, level);
    }
  });
  
  return {
    isValid: issues.filter(issue => issue.severity === 'error').length === 0,
    issues,
    suggestions,
  };
};

// Utility to check if a color is considered "light" or "dark"
export const isLightColor = (color: string): boolean => {
  return getRelativeLuminance(color) > 0.5;
};

export const isDarkColor = (color: string): boolean => {
  return !isLightColor(color);
};

// Generate optimal text color for any background
export const getOptimalTextColor = (
  backgroundColor: string,
  level: WCAGLevel = 'AA',
  preferredColor?: string
): string => {
  const whiteRatio = getContrastRatio('#ffffff', backgroundColor);
  const blackRatio = getContrastRatio('#000000', backgroundColor);
  const requiredRatio = level === 'AAA' ? WCAG_STANDARDS.AAA_NORMAL : WCAG_STANDARDS.AA_NORMAL;
  
  // If preferred color is provided and meets standards, use it
  if (preferredColor) {
    const preferredRatio = getContrastRatio(preferredColor, backgroundColor);
    if (preferredRatio >= requiredRatio) {
      return preferredColor;
    }
  }
  
  // Choose white or black based on which has better contrast
  if (whiteRatio >= requiredRatio && blackRatio >= requiredRatio) {
    return whiteRatio > blackRatio ? '#ffffff' : '#000000';
  } else if (whiteRatio >= requiredRatio) {
    return '#ffffff';
  } else if (blackRatio >= requiredRatio) {
    return '#000000';
  }
  
  // If neither meets the standard, adjust the better option
  const betterBase = whiteRatio > blackRatio ? '#ffffff' : '#000000';
  return adjustColorForContrast(betterBase, backgroundColor, level);
};

// Color accessibility audit for components
export const auditComponentColors = (
  componentName: string,
  colorCombinations: Array<{ foreground: string; background: string; context: string }>
): {
  componentName: string;
  passed: boolean;
  results: Array<{
    context: string;
    ratio: number;
    passes: boolean;
    level: 'AA' | 'AAA' | 'fail';
  }>;
} => {
  const results = colorCombinations.map(({ foreground, background, context }) => {
    const ratio = getContrastRatio(foreground, background);
    
    let level: 'AA' | 'AAA' | 'fail' = 'fail';
    if (ratio >= WCAG_STANDARDS.AAA_NORMAL) {
      level = 'AAA';
    } else if (ratio >= WCAG_STANDARDS.AA_NORMAL) {
      level = 'AA';
    }
    
    return {
      context,
      ratio,
      passes: level !== 'fail',
      level,
    };
  });
  
  return {
    componentName,
    passed: results.every(result => result.passes),
    results,
  };
};

export default {
  getContrastRatio,
  meetsWCAGStandard,
  adjustColorForContrast,
  validateColorScheme,
  generateAccessibleColors,
  getOptimalTextColor,
  auditComponentColors,
  isLightColor,
  isDarkColor,
};