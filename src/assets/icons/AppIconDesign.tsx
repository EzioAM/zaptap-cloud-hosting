import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Circle } from 'react-native-svg';

interface AppIconProps {
  size?: number;
}

export const AppIconDesign: React.FC<AppIconProps> = ({ size = 1024 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        {/* Main gradient - Indigo to Pink */}
        <LinearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#6366F1" />
          <Stop offset="50%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#EC4899" />
        </LinearGradient>
        
        {/* Accent gradient - Emerald touch */}
        <LinearGradient id="accentGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
        </LinearGradient>
        
        {/* Background gradient */}
        <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1F2937" />
          <Stop offset="100%" stopColor="#111827" />
        </LinearGradient>
      </Defs>
      
      {/* Background with rounded corners */}
      <Rect 
        x="0" 
        y="0" 
        width="1024" 
        height="1024" 
        rx="230" 
        ry="230" 
        fill="url(#bgGradient)" 
      />
      
      {/* Lightning bolt symbol - representing automation/speed */}
      <G transform="translate(512, 512)">
        {/* Outer glow effect */}
        <Circle r="350" fill="url(#mainGradient)" opacity="0.2" />
        <Circle r="280" fill="url(#mainGradient)" opacity="0.3" />
        
        {/* Main lightning bolt */}
        <Path
          d="M -120 -200 L 40 -40 L -20 -40 L 120 200 L -40 40 L 20 40 Z"
          fill="url(#mainGradient)"
          stroke="#FFFFFF"
          strokeWidth="12"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Inner highlight */}
        <Path
          d="M -100 -180 L 30 -50 L -10 -50 L 100 180 L -30 30 L 10 30 Z"
          fill="#FFFFFF"
          opacity="0.3"
        />
        
        {/* Accent dots representing connectivity */}
        <Circle cx="-200" cy="-100" r="20" fill="url(#accentGradient)" />
        <Circle cx="200" cy="-100" r="20" fill="url(#accentGradient)" />
        <Circle cx="-200" cy="100" r="20" fill="url(#accentGradient)" />
        <Circle cx="200" cy="100" r="20" fill="url(#accentGradient)" />
      </G>
      
      {/* Subtle Z letter overlay (for Zaptap) */}
      <Path
        d="M 300 350 L 724 350 L 724 400 L 380 674 L 724 674 L 724 724 L 300 724 L 300 674 L 644 400 L 300 400 Z"
        fill="#FFFFFF"
        opacity="0.1"
      />
    </Svg>
  );
};

// Export a simplified version for smaller sizes
export const AppIconSimple: React.FC<AppIconProps> = ({ size = 180 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      <Defs>
        <LinearGradient id="simpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#6366F1" />
          <Stop offset="100%" stopColor="#EC4899" />
        </LinearGradient>
      </Defs>
      
      <Rect 
        x="0" 
        y="0" 
        width="180" 
        height="180" 
        rx="40" 
        ry="40" 
        fill="#1F2937" 
      />
      
      <Path
        d="M 65 50 L 100 80 L 85 80 L 115 130 L 80 100 L 95 100 Z"
        fill="url(#simpleGradient)"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
};