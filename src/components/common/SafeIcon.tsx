import React from 'react';
import { PlatformUtils } from '../../utils/PlatformUtils';
import FallbackIcon from './FallbackIcon';

// Conditionally import vector icons
let VectorIcon: any = null;
try {
  if (PlatformUtils.areVectorIconsSupported()) {
    VectorIcon = require('@expo/vector-icons/MaterialCommunityIcons').default;
  }
} catch (error) {
  // Vector icons not available
  console.log('Vector icons not available, using fallback');
}

interface SafeIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Safe icon component that uses vector icons when available,
 * otherwise falls back to emoji icons
 */
const SafeIcon: React.FC<SafeIconProps> = (props) => {
  if (VectorIcon && PlatformUtils.areVectorIconsSupported()) {
    return <VectorIcon {...props} />;
  }
  
  return <FallbackIcon {...props} />;
};

export default SafeIcon;