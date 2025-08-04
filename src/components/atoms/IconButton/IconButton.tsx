import React from 'react';
import { TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { useHaptic } from '../../../hooks/useHaptic';

export interface IconButtonProps {
  icon: string;
  size?: 'small' | 'medium' | 'large';
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const sizeMap = {
  small: 32,
  medium: 40,
  large: 48,
};

const iconSizeMap = {
  small: 18,
  medium: 24,
  large: 28,
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'medium',
  onPress,
  disabled = false,
  color,
  style,
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { trigger } = useHaptic();
  
  const handlePress = () => {
    if (!disabled) {
      trigger('light');
      onPress();
    }
  };
  
  const buttonSize = sizeMap[size];
  const iconSize = iconSizeMap[size];
  const finalColor = color || colors.text.secondary;
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={iconSize}
        color={finalColor}
      />
    </TouchableOpacity>
  );
};