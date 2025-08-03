#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class AutoImplementer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.implementedFeatures = [];
  }

  async implementFromResearch(filePath, options = {}) {
    console.log('🚀 Starting auto-implementation...');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }

    let data;
    if (filePath.includes('analysis-results')) {
      // Analysis file
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.implementFromAnalysis(data, options);
    } else {
      // Raw research file
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.implementFromRawResearch(data, options);
    }

    console.log('✅ Auto-implementation complete!');
    this.printSummary();
  }

  implementFromAnalysis(analysisData, options) {
    console.log('📋 Implementing from analysis results...');
    
    const { recommendations } = analysisData;
    const priorityFilter = options.priority || 'all';
    const maxItems = options.maxItems || 5;

    let itemsToImplement = recommendations;
    
    if (priorityFilter !== 'all') {
      itemsToImplement = recommendations.filter(rec => rec.priority === priorityFilter);
    }

    itemsToImplement.slice(0, maxItems).forEach((recommendation, index) => {
      console.log(`\\n🔧 Implementing ${index + 1}/${itemsToImplement.length}: ${recommendation.title}`);
      this.implementRecommendation(recommendation);
    });
  }

  implementFromRawResearch(researchData, options) {
    console.log('🔍 Implementing from raw research data...');
    
    // Extract actionable items from research text
    const claudeText = researchData.claude || '';
    const chatgptText = researchData.chatgpt || '';
    
    const features = this.extractImplementableFeatures(claudeText, chatgptText);
    const maxItems = options.maxItems || 3;

    features.slice(0, maxItems).forEach((feature, index) => {
      console.log(`\\n🔧 Implementing ${index + 1}/${features.length}: ${feature.name}`);
      this.implementFeature(feature);
    });
  }

  implementRecommendation(recommendation) {
    const featureName = this.sanitizeFeatureName(recommendation.title);
    const feature = {
      name: featureName,
      description: recommendation.description,
      files: recommendation.files || ['src/components/'],
      dependencies: recommendation.dependencies || [],
      complexity: recommendation.complexity,
      type: this.determineFeatureType(recommendation.description)
    };

    this.implementFeature(feature);
  }

  extractImplementableFeatures(claudeText, chatgptText) {
    const features = [];
    const combinedText = claudeText + '\\n' + chatgptText;
    
    // Extract features from common patterns
    const featurePatterns = [
      /implement\\s+([^\\n.]+)/gi,
      /create\\s+([^\\n.]+)/gi,
      /add\\s+([^\\n.]+)/gi,
      /build\\s+([^\\n.]+)/gi
    ];

    featurePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        const featureName = match[1].trim();
        if (featureName.length > 5 && featureName.length < 100) {
          features.push({
            name: this.sanitizeFeatureName(featureName),
            description: featureName,
            type: this.determineFeatureType(featureName),
            complexity: 'medium'
          });
        }
      }
    });

    return [...new Map(features.map(f => [f.name, f])).values()]; // Remove duplicates
  }

  sanitizeFeatureName(name) {
    return name
      .replace(/[^a-zA-Z0-9\\s]/g, '')
      .replace(/\\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  determineFeatureType(description) {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('component') || lowerDesc.includes('ui') || lowerDesc.includes('button')) {
      return 'component';
    } else if (lowerDesc.includes('screen') || lowerDesc.includes('page') || lowerDesc.includes('view')) {
      return 'screen';
    } else if (lowerDesc.includes('service') || lowerDesc.includes('api') || lowerDesc.includes('manager')) {
      return 'service';
    } else if (lowerDesc.includes('hook') || lowerDesc.includes('use')) {
      return 'hook';
    } else if (lowerDesc.includes('util') || lowerDesc.includes('helper')) {
      return 'utility';
    }
    
    return 'component'; // default
  }

  implementFeature(feature) {
    try {
      switch (feature.type) {
        case 'component':
          this.createComponent(feature);
          break;
        case 'screen':
          this.createScreen(feature);
          break;
        case 'service':
          this.createService(feature);
          break;
        case 'hook':
          this.createHook(feature);
          break;
        case 'utility':
          this.createUtility(feature);
          break;
        default:
          this.createComponent(feature);
      }
      
      this.implementedFeatures.push(feature);
      console.log(`   ✅ ${feature.name} implemented successfully`);
      
    } catch (error) {
      console.error(`   ❌ Failed to implement ${feature.name}:`, error.message);
    }
  }

  createComponent(feature) {
    const componentName = feature.name;
    const componentDir = path.join(this.srcPath, 'components', 'generated');
    const componentFile = path.join(componentDir, `${componentName}.tsx`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    // Don't overwrite existing files
    if (fs.existsSync(componentFile)) {
      console.log(`   ⚠️  ${componentName} already exists, skipping...`);
      return;
    }

    const componentCode = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Card } from 'react-native-paper';

interface ${componentName}Props {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  title = '${feature.description}',
  onPress,
  disabled = false
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      console.log('${componentName} pressed');
    }
  };

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          ${feature.description}
        </Text>
        <Button
          mode="contained"
          onPress={handlePress}
          disabled={disabled}
          style={styles.button}
        >
          Activate
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default ${componentName};`;

    fs.writeFileSync(componentFile, componentCode);
  }

  createScreen(feature) {
    const screenName = feature.name.replace(/Screen$/, '') + 'Screen';
    const screenDir = path.join(this.srcPath, 'screens', 'generated');
    const screenFile = path.join(screenDir, `${screenName}.tsx`);

    if (!fs.existsSync(screenDir)) {
      fs.mkdirSync(screenDir, { recursive: true });
    }

    if (fs.existsSync(screenFile)) {
      console.log(`   ⚠️  ${screenName} already exists, skipping...`);
      return;
    }

    const screenCode = `import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, FAB, Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export const ${screenName}: React.FC = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement data loading logic
      console.log('Loading data for ${screenName}');
      setData([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    Alert.alert('Action', '${feature.description}');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="${screenName.replace(/([A-Z])/g, ' $1').trim()}" />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>${screenName.replace(/([A-Z])/g, ' $1').trim()}</Text>
            <Text style={styles.description}>
              ${feature.description}
            </Text>
            <Button
              mode="contained"
              onPress={handleAction}
              loading={isLoading}
              style={styles.button}
            >
              Get Started
            </Button>
          </Card.Content>
        </Card>
        
        {data.length === 0 && !isLoading && (
          <Card style={styles.card}>
            <Card.Content>
              <Text>No data available yet.</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ${screenName};`;

    fs.writeFileSync(screenFile, screenCode);
  }

  createService(feature) {
    const serviceName = feature.name.replace(/Service$/, '') + 'Service';
    const serviceDir = path.join(this.srcPath, 'services', 'generated');
    const serviceFile = path.join(serviceDir, `${serviceName}.ts`);

    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }

    if (fs.existsSync(serviceFile)) {
      console.log(`   ⚠️  ${serviceName} already exists, skipping...`);
      return;
    }

    const serviceCode = `export interface ${serviceName}Config {
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface ${serviceName}Result {
  success: boolean;
  data?: any;
  error?: string;
}

export class ${serviceName} {
  private static instance: ${serviceName};
  private config: ${serviceName}Config;

  private constructor(config: ${serviceName}Config = {}) {
    this.config = {
      timeout: 5000,
      retries: 3,
      ...config
    };
  }

  static getInstance(config?: ${serviceName}Config): ${serviceName} {
    if (!${serviceName}.instance) {
      ${serviceName}.instance = new ${serviceName}(config);
    }
    return ${serviceName}.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing ${serviceName}...');
      // TODO: Add initialization logic
      return true;
    } catch (error) {
      console.error('${serviceName} initialization failed:', error);
      return false;
    }
  }

  async execute(params?: any): Promise<${serviceName}Result> {
    try {
      console.log('Executing ${serviceName} with params:', params);
      
      // TODO: Implement main service logic
      // ${feature.description}
      
      return {
        success: true,
        data: { message: '${serviceName} executed successfully' }
      };
    } catch (error) {
      console.error('${serviceName} execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up ${serviceName}...');
      // TODO: Add cleanup logic
    } catch (error) {
      console.error('${serviceName} cleanup failed:', error);
    }
  }

  getConfig(): ${serviceName}Config {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<${serviceName}Config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export default ${serviceName};`;

    fs.writeFileSync(serviceFile, serviceCode);
  }

  createHook(feature) {
    const hookName = feature.name.startsWith('use') ? feature.name : `use${feature.name}`;
    const hookDir = path.join(this.srcPath, 'hooks', 'generated');
    const hookFile = path.join(hookDir, `${hookName}.ts`);

    if (!fs.existsSync(hookDir)) {
      fs.mkdirSync(hookDir, { recursive: true });
    }

    if (fs.existsSync(hookFile)) {
      console.log(`   ⚠️  ${hookName} already exists, skipping...`);
      return;
    }

    const hookCode = `import { useState, useEffect, useCallback } from 'react';

export interface ${hookName}Options {
  autoStart?: boolean;
  interval?: number;
}

export interface ${hookName}Result {
  data: any;
  isLoading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

export const ${hookName} = (options: ${hookName}Options = {}): ${hookName}Result => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Executing ${hookName}...');
      // TODO: Implement hook logic
      // ${feature.description}
      
      const result = { message: '${hookName} executed successfully' };
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('${hookName} failed:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (options.autoStart) {
      execute();
    }
  }, [execute, options.autoStart]);

  useEffect(() => {
    if (options.interval && options.interval > 0) {
      const intervalId = setInterval(execute, options.interval);
      return () => clearInterval(intervalId);
    }
  }, [execute, options.interval]);

  return {
    data,
    isLoading,
    error,
    execute,
    reset
  };
};

export default ${hookName};`;

    fs.writeFileSync(hookFile, hookCode);
  }

  createUtility(feature) {
    const utilName = feature.name.replace(/Utils?$/, '') + 'Utils';
    const utilDir = path.join(this.srcPath, 'utils', 'generated');
    const utilFile = path.join(utilDir, `${utilName}.ts`);

    if (!fs.existsSync(utilDir)) {
      fs.mkdirSync(utilDir, { recursive: true });
    }

    if (fs.existsSync(utilFile)) {
      console.log(`   ⚠️  ${utilName} already exists, skipping...`);
      return;
    }

    const utilCode = `/**
 * ${utilName}
 * ${feature.description}
 */

export class ${utilName} {
  /**
   * Main utility function
   */
  static execute(input: any): any {
    try {
      console.log('Executing ${utilName} with input:', input);
      // TODO: Implement utility logic
      // ${feature.description}
      
      return { success: true, result: input };
    } catch (error) {
      console.error('${utilName} failed:', error);
      throw error;
    }
  }

  /**
   * Validation helper
   */
  static validate(input: any): boolean {
    if (input == null) {
      return false;
    }
    // TODO: Add validation logic
    return true;
  }

  /**
   * Format helper
   */
  static format(input: any): string {
    if (input == null) {
      return '';
    }
    // TODO: Add formatting logic
    return String(input);
  }

  /**
   * Parse helper
   */
  static parse(input: string): any {
    try {
      // TODO: Add parsing logic
      return JSON.parse(input);
    } catch {
      return input;
    }
  }
}

// Convenience exports
export const ${utilName.toLowerCase().replace('utils', '')} = ${utilName}.execute;
export const validate${feature.name} = ${utilName}.validate;
export const format${feature.name} = ${utilName}.format;
export const parse${feature.name} = ${utilName}.parse;

export default ${utilName};`;

    fs.writeFileSync(utilFile, utilCode);
  }

  updateIndexFiles() {
    console.log('📝 Updating index files...');
    
    const directories = [
      'components/generated',
      'screens/generated',
      'services/generated',
      'hooks/generated',
      'utils/generated'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(this.srcPath, dir);
      if (fs.existsSync(fullPath)) {
        this.createIndexFile(fullPath);
      }
    });
  }

  createIndexFile(directory) {
    const indexFile = path.join(directory, 'index.ts');
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter(file => file !== 'index.ts');

    const exports = files.map(file => {
      const fileName = file.replace(/\\.(ts|tsx)$/, '');
      return `export * from './${fileName}';`;
    }).join('\\n');

    fs.writeFileSync(indexFile, exports);
  }

  printSummary() {
    console.log('\\n🎉 Implementation Summary:');
    console.log(`   📦 Total features implemented: ${this.implementedFeatures.length}`);
    
    const featureTypes = this.implementedFeatures.reduce((acc, feature) => {
      acc[feature.type] = (acc[feature.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(featureTypes).forEach(([type, count]) => {
      console.log(`   ${this.getTypeIcon(type)} ${type}: ${count}`);
    });

    console.log('\\n🔍 Generated files can be found in:');
    console.log('   src/components/generated/');
    console.log('   src/screens/generated/');
    console.log('   src/services/generated/');
    console.log('   src/hooks/generated/');
    console.log('   src/utils/generated/');

    console.log('\\n🚀 Next steps:');
    console.log('   1. Review generated files');
    console.log('   2. Customize implementation details');
    console.log('   3. Add to navigation/imports as needed');
    console.log('   4. Test features in developer menu');
  }

  getTypeIcon(type) {
    const icons = {
      component: '🧩',
      screen: '📱',
      service: '⚙️',
      hook: '🎣',
      utility: '🔧'
    };
    return icons[type] || '📄';
  }
}

// CLI Usage
function main() {
  const filePath = process.argv[2];
  const priority = process.argv.find(arg => arg.startsWith('--priority='))?.split('=')[1];
  const maxItems = parseInt(process.argv.find(arg => arg.startsWith('--max='))?.split('=')[1] || '5');

  if (!filePath) {
    console.log('Auto-Implementation Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/auto-implement.js <file> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --priority=high|medium|low  Filter by priority');
    console.log('  --max=N                     Maximum items to implement');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/auto-implement.js docs/research/research-results/new-features.json');
    console.log('  node scripts/auto-implement.js analysis-results/analysis.json --priority=high');
    console.log('  node scripts/auto-implement.js docs/research/research-results/ideas.json --max=3');
    process.exit(1);
  }

  const implementer = new AutoImplementer();
  implementer.implementFromResearch(filePath, { priority, maxItems })
    .then(() => {
      implementer.updateIndexFiles();
    })
    .catch(error => {
      console.error('❌ Implementation failed:', error.message);
      process.exit(1);
    });
}

if (require.main === module) {
  main();
}

module.exports = AutoImplementer;