import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// List of screens we need to restore
const screensToRestore = [
  { name: 'ModernHomeScreen', path: 'screens/modern/ModernHomeScreen', priority: 'High' },
  { name: 'BuildScreen', path: 'screens/modern/BuildScreen', priority: 'High' },
  { name: 'DiscoverScreen', path: 'screens/modern/DiscoverScreen', priority: 'Medium' },
  { name: 'LibraryScreen', path: 'screens/modern/LibraryScreen', priority: 'Medium' },
  { name: 'ModernProfileScreen', path: 'screens/modern/ModernProfileScreen', priority: 'Low' },
];

export const ScreenLoaderTest = () => {
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Restoration Plan</Text>
      <Text style={styles.subtitle}>
        Screens to restore after fixing core systems
      </Text>
      
      <ScrollView style={styles.results}>
        {screensToRestore.map(screen => (
          <View key={screen.name} style={styles.resultRow}>
            <Text style={styles.screenName}>{screen.name}</Text>
            <View style={styles.priorityBadge}>
              <Text style={[
                styles.priorityText,
                screen.priority === 'High' && styles.highPriority,
                screen.priority === 'Medium' && styles.mediumPriority,
                screen.priority === 'Low' && styles.lowPriority
              ]}>
                {screen.priority}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Known issues to fix:
          {'\n'}• UnifiedThemeProvider crashes
          {'\n'}• useUnifiedTheme hook missing
          {'\n'}• Components need theme fallbacks
          {'\n'}• Navigation needs error boundaries
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  results: {
    maxHeight: 200,
    marginTop: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  screenName: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  info: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  highPriority: {
    color: '#ff4444',
  },
  mediumPriority: {
    color: '#ff8800',
  },
  lowPriority: {
    color: '#4CAF50',
  },
});