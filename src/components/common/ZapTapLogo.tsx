import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface ZapTapLogoProps {
  size?: number;
  style?: ViewStyle;
  variant?: 'gradient' | 'solid' | 'monochrome';
  color?: string;
  showRipple?: boolean;
}

export const ZapTapLogo: React.FC<ZapTapLogoProps> = ({
  size = 100,
  style,
  variant = 'gradient',
  color = '#6200ee',
  showRipple = true,
}) => {
  const getFillColor = () => {
    switch (variant) {
      case 'gradient':
        return 'url(#lightning-gradient)';
      case 'monochrome':
        return color;
      case 'solid':
      default:
        return '#6200ee';
    }
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Lightning bolt */}
        <Path
          d="M55 15 L35 45 L45 45 L40 70 L65 35 L50 35 Z"
          fill={getFillColor()}
          stroke={variant === 'gradient' ? '#6200ee' : color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        
        {/* Tap ripple effects */}
        {showRipple && (
          <>
            <Circle
              cx="52"
              cy="68"
              r="8"
              fill="none"
              stroke="#FFD600"
              strokeWidth="1.5"
              opacity="0.6"
            />
            <Circle
              cx="52"
              cy="68"
              r="14"
              fill="none"
              stroke="#FFD600"
              strokeWidth="1"
              opacity="0.3"
            />
          </>
        )}
        
        {/* Gradient definition */}
        {variant === 'gradient' && (
          <Defs>
            <LinearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6200ee" />
              <Stop offset="100%" stopColor="#FFD600" />
            </LinearGradient>
          </Defs>
        )}
      </Svg>
    </View>
  );
};

export default ZapTapLogo;