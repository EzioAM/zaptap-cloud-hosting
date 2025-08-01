import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface FallbackIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle | TextStyle;
}

/**
 * Fallback icon component for when vector icons aren't available
 */
const FallbackIcon: React.FC<FallbackIconProps> = ({ 
  name, 
  size = 24, 
  color = '#000',
  style 
}) => {
  // Map common icon names to emoji or text fallbacks
  const iconMap: Record<string, string> = {
    // Navigation
    'menu': '☰',
    'close': '✕',
    'arrow-left': '←',
    'arrow-right': '→',
    'arrow-up': '↑',
    'arrow-down': '↓',
    'chevron-left': '‹',
    'chevron-right': '›',
    'chevron-up': '^',
    'chevron-down': 'v',
    
    // Actions
    'plus': '+',
    'minus': '-',
    'check': '✓',
    'delete': '🗑',
    'edit': '✏',
    'pencil': '✏',
    'save': '💾',
    'share': '📤',
    'download': '⬇',
    'upload': '⬆',
    'search': '🔍',
    'filter': '🔽',
    'refresh': '🔄',
    'settings': '⚙',
    'cog': '⚙',
    
    // Communication
    'email': '📧',
    'phone': '📞',
    'sms': '💬',
    'message': '💬',
    'chat': '💬',
    'notification': '🔔',
    'bell': '🔔',
    
    // Media
    'camera': '📷',
    'photo': '🖼',
    'image': '🖼',
    'video': '🎥',
    'play': '▶',
    'pause': '⏸',
    'stop': '⏹',
    'music': '🎵',
    'volume-high': '🔊',
    'volume-low': '🔉',
    'volume-off': '🔇',
    
    // Technology
    'wifi': '📶',
    'bluetooth': '🔵',
    'nfc': '📡',
    'qrcode': '⊞',
    'qr-scan': '⊞',
    'barcode': '|||',
    'computer': '💻',
    'phone-android': '📱',
    'tablet': '📱',
    
    // Location
    'map': '🗺',
    'map-marker': '📍',
    'location': '📍',
    'crosshairs-gps': '🎯',
    'navigation': '🧭',
    'compass': '🧭',
    
    // Files
    'folder': '📁',
    'file': '📄',
    'file-text': '📄',
    'file-image': '🖼',
    'file-video': '🎥',
    'file-music': '🎵',
    'cloud': '☁',
    
    // Status
    'check-circle': '✅',
    'alert-circle': '⚠',
    'information': 'ℹ',
    'help': '❓',
    'warning': '⚠',
    'error': '❌',
    'success': '✅',
    
    // Tools
    'wrench': '🔧',
    'hammer': '🔨',
    'screwdriver': '🪛',
    'gear': '⚙',
    'tool': '🔧',
    
    // Social
    'heart': '♥',
    'star': '⭐',
    'thumbs-up': '👍',
    'thumbs-down': '👎',
    'user': '👤',
    'users': '👥',
    'account': '👤',
    'profile': '👤',
    
    // Automation specific
    'robot': '🤖',
    'automation': '⚡',
    'workflow': '🔄',
    'trigger': '🎯',
    'action': '⚡',
    'step': '📝',
    'variable': '📊',
    'condition': '❓',
    'loop': '🔄',
    'branch': '🌿',
    
    // Time
    'clock': '🕐',
    'timer': '⏱',
    'calendar': '📅',
    'schedule': '📅',
    'time': '🕐',
    
    // Default fallbacks
    'flask': '🧪',
    'layers': '📚',
    'gesture-tap': '👆',
    'login': '🔑',
    'logout': '🚪',
    'lock': '🔒',
    'unlock': '🔓',
    'eye': '👁',
    'eye-off': '🙈',
    'home': '🏠',
    'work': '🏢',
    'school': '🏫',
  };

  const fallbackText = iconMap[name] || iconMap[name.replace(/-/g, '')] || '•';

  return (
    <Text 
      style={[
        styles.icon, 
        { 
          fontSize: size, 
          color,
          lineHeight: size + 2 
        }, 
        style
      ]}
    >
      {fallbackText}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    fontWeight: 'normal',
  },
});

export default FallbackIcon;