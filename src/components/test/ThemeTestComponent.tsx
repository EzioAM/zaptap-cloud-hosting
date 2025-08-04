import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { useTheme as usePaperTheme } from 'react-native-paper';

export const ThemeTestComponent = () => {
  const [themeStatus, setThemeStatus] = useState('🔍 Testing theme...');
  const paperTheme = usePaperTheme();
  
  // Test Unified Theme at component level (hooks must be called at top level)
  let unifiedThemeStatus = '🔍 Testing UnifiedTheme...';
  let unifiedTheme = null;
  
  try {
    // Try to use the hook - this will work if we're inside the provider
    const { useUnifiedTheme } = require('../../contexts/ThemeCompatibilityShim');
    const themeHookResult = useUnifiedTheme();
    
    if (themeHookResult && themeHookResult.theme) {
      unifiedThemeStatus = '✅ UnifiedTheme Working (Compatibility Mode)';
      unifiedTheme = themeHookResult.theme;
      console.log('✅ Unified theme loaded (compat):', themeHookResult);
    } else {
      unifiedThemeStatus = '⚠️ UnifiedTheme returned null';
    }
  } catch (error: any) {
    unifiedThemeStatus = '❌ UnifiedTheme Not Available';
    console.log('⚠️ UnifiedTheme not available, using Paper theme fallback');
  }
  
  // Test Paper theme
  React.useEffect(() => {
    if (paperTheme && paperTheme.colors) {
      setThemeStatus('✅ Paper Theme Working');
      console.log('✅ Paper theme loaded:', paperTheme);
    } else {
      setThemeStatus('❌ Paper Theme Error');
    }
  }, [paperTheme]);

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Theme System Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>React Native Paper Theme</Text>
          <Text style={styles.status}>{themeStatus}</Text>
          
          {paperTheme && (
            <View style={styles.details}>
              <Text style={styles.label}>Theme Colors:</Text>
              <View style={styles.colorRow}>
                <View style={[styles.colorBox, { backgroundColor: paperTheme.colors.primary }]} />
                <Text style={styles.colorText}>Primary: {paperTheme.colors.primary}</Text>
              </View>
              <View style={styles.colorRow}>
                <View style={[styles.colorBox, { backgroundColor: paperTheme.colors.background }]} />
                <Text style={styles.colorText}>Background: {paperTheme.colors.background}</Text>
              </View>
              <View style={styles.colorRow}>
                <View style={[styles.colorBox, { backgroundColor: paperTheme.colors.surface }]} />
                <Text style={styles.colorText}>Surface: {paperTheme.colors.surface}</Text>
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unified Theme Provider</Text>
          <Text style={styles.status}>{unifiedThemeStatus}</Text>
          
          {unifiedTheme && (
            <View style={styles.details}>
              <Text style={styles.label}>Theme Mode: {unifiedTheme.mode || 'N/A'}</Text>
              <Text style={styles.label}>Has Colors: {unifiedTheme.colors ? 'Yes' : 'No'}</Text>
              <Text style={styles.label}>Has Typography: {unifiedTheme.typography ? 'Yes' : 'No'}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Compatibility</Text>
          <Text style={styles.info}>
            The app is currently using ThemeCompatibilityShim as a fallback.
            {'\n\n'}
            If UnifiedTheme fails, we need to fix:
            {'\n'}• Circular imports in theme files
            {'\n'}• Token initialization
            {'\n'}• Theme structure compatibility
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
  },
  details: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorBox: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorText: {
    fontSize: 12,
  },
  info: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});