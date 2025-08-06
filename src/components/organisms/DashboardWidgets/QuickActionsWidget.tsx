import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  gradient: string[];
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onPress, 
  gradient
}) => {
  const theme = useSafeTheme();

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradient}
        style={styles.gradientButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons 
          name={icon as any} 
          size={32} 
          color="white" 
        />
      </LinearGradient>
      <Text style={[styles.actionLabel, { color: theme.colors?.textSecondary || '#666' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const QuickActionsWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useSafeTheme();

  const actions = [
    {
      icon: 'plus-circle',
      label: 'Create',
      gradient: ['#6366F1', '#818CF8'],
      onPress: () => navigation.navigate('AutomationBuilder'),
    },
    {
      icon: 'qrcode-scan',
      label: 'Scan',
      gradient: ['#EC4899', '#F472B6'],
      onPress: () => navigation.navigate('Scanner'),
    },
    {
      icon: 'import',
      label: 'Import',
      gradient: ['#10B981', '#34D399'],
      onPress: () => navigation.navigate('LibraryTab'), // TODO: Replace with Import when implemented
    },
    {
      icon: 'compass',
      label: 'Discover',
      gradient: ['#F59E0B', '#FCD34D'],
      onPress: () => navigation.navigate('DiscoverTab'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
        Quick Actions
      </Text>
      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <ActionButton
            key={action.label}
            {...action}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default QuickActionsWidget;