import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, CardBody, Button } from '../../atoms';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { useHaptic } from '../../../hooks/useHaptic';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ActionButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  gradient: string[];
  delay?: number;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onPress, 
  gradient,
  delay = 0 
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { trigger } = useHaptic();

  const handlePress = () => {
    trigger('medium');
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.actionButton}
    >
      <LinearGradient
        colors={gradient}
        style={styles.gradientButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Button
          variant="ghost"
          size="large"
          label=""
          onPress={handlePress}
          style={styles.transparentButton}
          icon={icon}
        />
      </LinearGradient>
      <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

export const QuickActionsWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);

  const actions = [
    {
      icon: 'plus-circle' as const,
      label: 'Create',
      gradient: [colors.brand.primary, colors.brand.primaryLight],
      onPress: () => navigation.navigate('AutomationBuilder'),
    },
    {
      icon: 'qrcode-scan' as const,
      label: 'Scan',
      gradient: [colors.brand.secondary, '#FF6B9D'],
      onPress: () => navigation.navigate('Gallery'), // TODO: Replace with Scanner when implemented
    },
    {
      icon: 'import' as const,
      label: 'Import',
      gradient: [colors.brand.accent, '#34D399'],
      onPress: () => navigation.navigate('Templates'), // TODO: Replace with Import when implemented
    },
    {
      icon: 'compass' as const,
      label: 'Discover',
      gradient: ['#F59E0B', '#FCD34D'],
      onPress: () => navigation.navigate('DiscoverTab'),
    },
  ];

  return (
    <Card variant="elevated" style={styles.container} elevation="md">
      <CardBody>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <ActionButton
              key={action.label}
              {...action}
              delay={index * 100}
            />
          ))}
        </View>
      </CardBody>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.titleMedium,
    marginBottom: theme.spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  gradientButton: {
    width: 64,
    height: 64,
    borderRadius: theme.tokens.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  transparentButton: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
    padding: 0,
    minHeight: 0,
  },
  actionLabel: {
    ...theme.typography.labelSmall,
  },
});