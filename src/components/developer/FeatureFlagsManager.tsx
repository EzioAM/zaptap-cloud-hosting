import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Switch,
  List,
  Button,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { DeveloperService } from '../../services/developer/DeveloperService';
import { EventLogger } from '../../utils/EventLogger';

interface FeatureFlag {
  key: string;
  value: boolean;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'feature' | 'debugging' | 'ui' | 'integration';
}

const FEATURE_FLAG_CONFIG: { [key: string]: Omit<FeatureFlag, 'key' | 'value'> } = {
  nfcEnabled: {
    description: 'Enable NFC tag reading and writing functionality',
    impact: 'high',
    category: 'feature',
  },
  aiAssistant: {
    description: 'Enable AI-powered automation assistant and suggestions',
    impact: 'medium',
    category: 'feature',
  },
  advancedAnalytics: {
    description: 'Collect detailed usage analytics and performance metrics',
    impact: 'medium',
    category: 'feature',
  },
  betaFeatures: {
    description: 'Enable experimental and beta features',
    impact: 'high',
    category: 'feature',
  },
  debugMode: {
    description: 'Enable detailed debug logging and error reporting',
    impact: 'low',
    category: 'debugging',
  },
  weatherEffects: {
    description: 'Enable weather-based visual effects on home screen',
    impact: 'low',
    category: 'ui',
  },
  iotIntegration: {
    description: 'Enable IoT device integration and control features',
    impact: 'high',
    category: 'integration',
  },
  premiumFeatures: {
    description: 'Enable premium features and advanced functionality',
    impact: 'high',
    category: 'feature',
  },
};

export const FeatureFlagsManager: React.FC = () => {
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = () => {
    const currentFlags = DeveloperService.getFeatureFlags();
    setFlags(currentFlags);
  };

  const toggleFlag = (key: string, value: boolean) => {
    Alert.alert(
      'Toggle Feature Flag',
      `Are you sure you want to ${value ? 'enable' : 'disable'} "${key}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            DeveloperService.setFeatureFlag(key, value);
            setFlags(prev => ({ ...prev, [key]: value }));
            EventLogger.info('FeatureFlagsManager', `Feature flag ${key} set to ${value}`);
          },
        },
      ]
    );
  };

  const resetAllFlags = () => {
    Alert.alert(
      'Reset All Feature Flags',
      'This will reset all feature flags to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset to defaults
            const defaultFlags = {
              nfcEnabled: true,
              aiAssistant: true,
              advancedAnalytics: false,
              betaFeatures: __DEV__,
              debugMode: __DEV__,
              weatherEffects: true,
              iotIntegration: false,
              premiumFeatures: false,
            };

            Object.entries(defaultFlags).forEach(([key, value]) => {
              DeveloperService.setFeatureFlag(key, value);
            });

            setFlags(defaultFlags);
            EventLogger.info('FeatureFlagsManager', 'All feature flags reset to defaults');
          },
        },
      ]
    );
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'feature': return 'star';
      case 'debugging': return 'bug';
      case 'ui': return 'palette';
      case 'integration': return 'link-variant';
      default: return 'cog';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'feature': return '#6200ee';
      case 'debugging': return '#ff5722';
      case 'ui': return '#2196f3';
      case 'integration': return '#00bcd4';
      default: return '#757575';
    }
  };

  const groupedFlags = Object.entries(flags).reduce((groups, [key, value]) => {
    const config = FEATURE_FLAG_CONFIG[key];
    if (config) {
      const category = config.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ key, value, ...config });
    }
    return groups;
  }, {} as { [category: string]: FeatureFlag[] });

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  return (
    <ScrollView style={styles.container}>
      {/* Summary */}
      <Card style={styles.card}>
        <Card.Title title="Feature Flags Overview" />
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{enabledCount}</Text>
              <Text style={styles.summaryLabel}>Enabled</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount - enabledCount}</Text>
              <Text style={styles.summaryLabel}>Disabled</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Feature Flags by Category */}
      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <Card key={category} style={styles.card}>
          <Card.Title
            title={category.charAt(0).toUpperCase() + category.slice(1)}
            left={(props) => (
              <Icon
                name={getCategoryIcon(category)}
                size={24}
                color={getCategoryColor(category)}
              />
            )}
          />
          <Card.Content>
            {categoryFlags.map((flag) => (
              <View key={flag.key} style={styles.flagItem}>
                <List.Item
                  title={flag.key}
                  description={flag.description}
                  left={(props) => (
                    <View style={styles.flagIcon}>
                      <Switch
                        value={flag.value}
                        onValueChange={(value) => toggleFlag(flag.key, value)}
                      />
                    </View>
                  )}
                  right={() => (
                    <View style={styles.flagMeta}>
                      <Chip
                        mode="outlined"
                        textStyle={{ 
                          fontSize: 10, 
                          color: getImpactColor(flag.impact) 
                        }}
                        style={{ 
                          borderColor: getImpactColor(flag.impact),
                          height: 24,
                        }}
                      >
                        {flag.impact}
                      </Chip>
                    </View>
                  )}
                  titleStyle={styles.flagTitle}
                  descriptionStyle={styles.flagDescription}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      ))}

      {/* Warning for High Impact Flags */}
      <Card style={[styles.card, styles.warningCard]}>
        <Card.Content>
          <View style={styles.warningContent}>
            <Icon name="alert" size={20} color="#ff9800" />
            <Text style={styles.warningText}>
              High impact flags may significantly change app behavior. Use with caution in production.
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Title title="Actions" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={resetAllFlags}
            style={styles.actionButton}
            icon="restore"
          >
            Reset to Defaults
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              const flagsReport = {
                timestamp: new Date().toISOString(),
                flags,
                environment: __DEV__ ? 'development' : 'production',
              };
              console.log('FEATURE_FLAGS_REPORT:', JSON.stringify(flagsReport, null, 2));
              EventLogger.info('FeatureFlagsManager', 'Feature flags report exported to console');
            }}
            style={styles.actionButton}
            icon="export"
          >
            Export Configuration
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  flagItem: {
    marginBottom: 8,
  },
  flagIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  flagMeta: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  flagDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});