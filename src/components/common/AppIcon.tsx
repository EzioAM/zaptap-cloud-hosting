import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICON_MAPPINGS, IconName } from '../../constants/iconMappings';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle | TextStyle;
}

export const AppIcon: React.FC<AppIconProps> = ({ 
  name, 
  size = 24, 
  color = '#000',
  style 
}) => {
  const iconName = ICON_MAPPINGS[name] || 'help-circle';
  
  return (
    <MaterialCommunityIcons 
      name={iconName as any}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default AppIcon;