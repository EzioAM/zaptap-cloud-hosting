import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  action,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {icon && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={iconColor || colors.text.primary}
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title(colors), titleStyle]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle(colors), subtitleStyle]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const styles = {
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingBottom: theme.spacing.md,
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: (colors: any) => ({
    ...theme.typography.titleMedium,
    color: colors.text.primary,
  }),
  subtitle: (colors: any) => ({
    ...theme.typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  }),
  action: {
    marginLeft: theme.spacing.md,
  },
};