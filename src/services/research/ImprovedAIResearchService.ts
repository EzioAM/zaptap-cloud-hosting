import { LocalResearchService, ResearchTopic } from './LocalResearchService';
import Constants from 'expo-constants';

interface ResearchQuery {
  topic: string;
  context?: string;
  specificQuestions?: string[];
  focusAreas?: string[];
  outputFormat?: 'structured' | 'narrative';
}

interface ResearchResult {
  provider: 'claude' | 'chatgpt' | 'local' | 'enhanced-local';
  insights: string[];
  recommendations: string[];
  codeExamples?: string[];
  sources?: string[];
  confidence: number; // 0-1 score
}

export class ImprovedAIResearchService {
  private claudeApiKey: string | null;
  private openaiApiKey: string | null;
  private isConfigured: boolean = false;

  constructor() {
    // Try multiple ways to get API keys from environment
    this.claudeApiKey = this.getApiKey('claudeApiKey', 'CLAUDE_API_KEY');
    this.openaiApiKey = this.getApiKey('openaiApiKey', 'OPENAI_API_KEY');
    
    this.isConfigured = !!(
      (this.claudeApiKey && this.claudeApiKey.length > 10) ||
      (this.openaiApiKey && this.openaiApiKey.length > 10)
    );

    EventLogger.debug('ImprovedAIResearch', '🔧 AI Research Service initialized:', {
      hasClaudeKey: !!(this.claudeApiKey && this.claudeApiKey.length > 10);,
      hasOpenAIKey: !!(this.openaiApiKey && this.openaiApiKey.length > 10),
      isConfigured: this.isConfigured
    });
  }

  private getApiKey(configKey: string, envKey: string): string | null {
    // Try multiple sources for API keys
    return Constants.expoConfig?.extra?.[configKey] ||
           Constants.manifest?.extra?.[configKey] ||
           Constants.manifest2?.extra?.expoClient?.extra?.[configKey] ||
           process.env[envKey] ||
           null;
  }

  /**
   * Main research method with enhanced fallback capabilities
   */
  async researchAppImprovements(query: ResearchQuery | any): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];
    
    // Normalize query structure
    const normalizedQuery: ResearchQuery = typeof query === 'string' 
      ? { topic: query }
      : query;

    EventLogger.debug('ImprovedAIResearch', '🔍 Starting research for:', normalizedQuery.topic);

    // Always try enhanced local research first
    try {
      const enhancedLocal = await this.performEnhancedLocalResearch(normalizedQuery);
      if (enhancedLocal) {
        results.push(enhancedLocal);
      }
    } catch (error) {
      EventLogger.error('ImprovedAIResearch', 'Enhanced local research failed:', error as Error);
    }

    // Try API-based research if configured
    if (this.isConfigured) {
      try {
        const apiResults = await this.performAPIResearch(normalizedQuery);
        results.push(...apiResults);
      } catch (error) {
        EventLogger.error('ImprovedAIResearch', 'API research failed:', error as Error);
      }
    }

    // Always include basic local research as fallback
    try {
      const localResult = this.performBasicLocalResearch(normalizedQuery);
      if (localResult) {
        results.push(localResult);
      }
    } catch (error) {
      EventLogger.error('ImprovedAIResearch', 'Basic local research failed:', error as Error);
    }

    // If no results, generate a helpful response
    if (results.length === 0) {
      results.push(this.generateHelpfulFallback(normalizedQuery));
    }

    EventLogger.debug('ImprovedAIResearch', '📊 Research complete: ${results.length} results from ${results.map(r => r.provider).join(', ');}`);
    return results;
  }

  /**
   * Enhanced local research that combines multiple data sources
   */
  private async performEnhancedLocalResearch(query: ResearchQuery): Promise<ResearchResult | null> {
    try {
      // Get local research data
      const localTopic = LocalResearchService.getResearch(query.topic);
      const searchResults = LocalResearchService.searchTopics(query.topic);
      
      if (!localTopic && searchResults.length === 0) {
        return null;
      }

      // Combine and enhance results
      const insights: string[] = [];
      const recommendations: string[] = [];
      const codeExamples: string[] = [];

      // Add insights from exact match
      if (localTopic) {
        insights.push(...localTopic.insights);
        recommendations.push(...localTopic.recommendations);
        codeExamples.push(...(localTopic.codeExamples || []));
      }

      // Add insights from search results
      searchResults.forEach(result => {
        // Add unique insights
        result.insights.forEach(insight => {
          if (!insights.includes(insight)) {
            insights.push(insight);
          }
        });
        
        // Add unique recommendations
        result.recommendations.forEach(rec => {
          if (!recommendations.includes(rec)) {
            recommendations.push(rec);
          }
        });
      });

      // Generate additional context-aware recommendations
      if (query.specificQuestions) {
        query.specificQuestions.forEach(question => {
          recommendations.push(`Research answer for: ${question}`);
        });
      }

      return {
        provider: 'enhanced-local',
        insights: insights.slice(0, 10),
        recommendations: recommendations.slice(0, 12),
        codeExamples: codeExamples.slice(0, 5),
        sources: ['Local Knowledge Base', 'Codebase Analysis', 'Best Practices Database'],
        confidence: 0.8
      };
    } catch (error) {
      EventLogger.error('ImprovedAIResearch', 'Enhanced local research error:', error as Error);
      return null;
    }
  }

  /**
   * Perform API-based research (placeholder for actual implementation)
   */
  private async performAPIResearch(query: ResearchQuery): Promise<ResearchResult[]> {
    // In a production app, you would implement actual API calls here
    // For now, return empty array to indicate API research is not available
    EventLogger.debug('ImprovedAIResearch', '⚠️ API research not implemented in React Native environment');
    return [];
  }

  /**
   * Basic local research fallback
   */
  private performBasicLocalResearch(query: ResearchQuery): ResearchResult | null {
    const localTopic = LocalResearchService.getResearch(query.topic);
    
    if (!localTopic) {
      return null;
    }

    return {
      provider: 'local',
      insights: localTopic.insights.slice(0, 5),
      recommendations: localTopic.recommendations.slice(0, 8),
      codeExamples: localTopic.codeExamples?.slice(0, 3),
      sources: localTopic.sources,
      confidence: 0.7
    };
  }

  /**
   * Generate a helpful fallback response
   */
  private generateHelpfulFallback(query: ResearchQuery): ResearchResult {
    const topic = query.topic.toLowerCase();
    
    // Generate contextual insights based on common patterns
    const insights: string[] = [
      `Consider implementing ${query.topic} using React Native best practices`,
      'Ensure compatibility with both iOS and Android platforms',
      'Focus on performance optimization for mobile devices',
      'Implement proper error handling and user feedback',
      'Consider offline functionality and data persistence'
    ];

    const recommendations: string[] = [
      `Research ${query.topic} implementation patterns in React Native`,
      'Review similar implementations in popular React Native apps',
      'Consider using established libraries from the React Native community',
      'Implement comprehensive testing for this feature',
      'Gather user feedback early in the development process',
      'Document the implementation for future maintenance'
    ];

    // Add specific recommendations based on keywords
    if (topic.includes('performance')) {
      recommendations.push(
        'Use React.memo and useMemo for optimization',
        'Implement lazy loading and code splitting',
        'Optimize image loading and caching'
      );
    }

    if (topic.includes('security')) {
      recommendations.push(
        'Implement proper authentication and authorization',
        'Use secure storage for sensitive data',
        'Validate all user inputs'
      );
    }

    if (topic.includes('nfc')) {
      recommendations.push(
        'Test NFC functionality on various devices',
        'Implement fallback options for devices without NFC',
        'Handle NFC permissions properly'
      );
    }

    const codeExamples = [
      `// Example ${query.topic} implementation
import React from 'react';
import { View, Text } from 'react-native';
import { EventLogger } from '../../utils/EventLogger';

export const ${query.topic.replace(/\s+/g, '')}Component = () => {
  // Implementation would go here
  return (
    <View>
      <Text>${query.topic}</Text>
    </View>
  );
};`
    ];

    return {
      provider: 'enhanced-local',
      insights,
      recommendations,
      codeExamples,
      sources: ['React Native Best Practices', 'Community Guidelines', 'Mobile Development Patterns'],
      confidence: 0.6
    };
  }

  /**
   * Check if AI services are properly configured
   */
  isAIConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): {
    claudeConfigured: boolean;
    openaiConfigured: boolean;
    anyConfigured: boolean;
    recommendation: string;
  } {
    const claudeConfigured = !!(this.claudeApiKey && this.claudeApiKey.length > 10);
    const openaiConfigured = !!(this.openaiApiKey && this.openaiApiKey.length > 10);
    
    return {
      claudeConfigured,
      openaiConfigured,
      anyConfigured: claudeConfigured || openaiConfigured,
      recommendation: !claudeConfigured && !openaiConfigured 
        ? 'Configure API keys in your environment variables for enhanced AI research'
        : 'AI services are configured and ready'
    };
  }

  /**
   * Generate smart research topics based on app analysis
   */
  async generateSmartTopics(): Promise<string[]> {
    // These topics are specifically relevant to the Zaptap app
    return [
      'NFC Tag Security Best Practices',
      'Offline Automation Execution',
      'React Native Performance Optimization',
      'Supabase Real-time Features',
      'Mobile App Accessibility Standards',
      'Cross-platform QR Code Generation',
      'Redux Toolkit Advanced Patterns',
      'React Navigation Deep Linking',
      'Expo Managed Workflow Optimization',
      'Mobile App State Persistence',
      'Background Task Management',
      'Push Notification Strategies'
    ];
  }
}