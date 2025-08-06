import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

interface PlaceholderScreenProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  icon,
  description,
}) => {
  const theme = useSafeTheme();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors?.text || '#000'} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
          {title}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: (theme.colors?.primary || '#6200ee') + '20' }]}>
          <MaterialCommunityIcons
            name={icon}
            size={64}
            color={theme.colors?.primary || '#6200ee'}
          />
        </View>
        
        <Text style={[styles.comingSoonTitle, { color: theme.colors?.text || '#000' }]}>
          Coming Soon
        </Text>
        
        <Text style={[styles.description, { color: theme.colors?.textSecondary || '#666' }]}>
          {description}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors?.primary || '#6200ee' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});