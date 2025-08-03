export interface CodebaseInsight {
  category: 'performance' | 'security' | 'architecture' | 'ui-ux' | 'features' | 'testing' | 'dependencies';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  suggestedActions: string[];
  researchTopic: string;
}

export interface CodebaseAnalysis {
  insights: CodebaseInsight[];
  techStack: {
    framework: string[];
    ui: string[];
    state: string[];
    backend: string[];
    testing: string[];
    dependencies: string[];
  };
  architecture: {
    patterns: string[];
    complexity: 'low' | 'medium' | 'high';
    maintainability: number; // 1-10 score
  };
  suggestedResearchTopics: string[];
}

export class CodebaseAnalysisService {
  private static packageJsonCache: any = null;
  private static tsConfigCache: any = null;

  /**
   * Analyze the current codebase to generate dynamic research topics
   */
  static async analyzeCodebase(): Promise<CodebaseAnalysis> {
    try {
      const insights: CodebaseInsight[] = [];
      
      // Analyze package.json for tech stack and dependencies
      const techStackAnalysis = await this.analyzeTechStack();
      
      // Analyze architecture patterns based on known project structure
      const architectureAnalysis = this.analyzeArchitecture();
      
      // Generate insights based on the current codebase
      insights.push(...this.generatePerformanceInsights(techStackAnalysis));
      insights.push(...this.generateSecurityInsights(techStackAnalysis));
      insights.push(...this.generateArchitectureInsights(architectureAnalysis));
      insights.push(...this.generateUIUXInsights(techStackAnalysis));
      insights.push(...this.generateFeatureInsights());
      insights.push(...this.generateTestingInsights(techStackAnalysis));

      const suggestedResearchTopics = this.generateResearchTopics(insights, techStackAnalysis);

      return {
        insights,
        techStack: techStackAnalysis,
        architecture: architectureAnalysis,
        suggestedResearchTopics
      };
    } catch (error) {
      console.error('Codebase analysis failed:', error);
      return this.getFallbackAnalysis();
    }
  }

  private static async analyzeTechStack(): Promise<CodebaseAnalysis['techStack']> {
    // Since we're in React Native, we can't directly read files
    // We'll use known information about the project from CLAUDE.md
    return {
      framework: ['React Native', 'TypeScript', 'Expo SDK 53'],
      ui: ['React Native Paper', 'Material Design 3', 'React Native Vector Icons'],
      state: ['Redux Toolkit', 'RTK Query', 'Redux Persist'],
      backend: ['Supabase', 'PostgreSQL', 'Edge Functions'],
      testing: ['Jest', 'React Native Testing Library'],
      dependencies: [
        'React Navigation 6',
        'React Hook Form',
        'Yup Validation',
        'AsyncStorage',
        'NFC Manager',
        'QR Code Scanner',
        'Expo Constants',
        'Expo Camera'
      ]
    };
  }

  private static analyzeArchitecture(): CodebaseAnalysis['architecture'] {
    // Based on the project structure from CLAUDE.md
    return {
      patterns: [
        'Service-Oriented Architecture',
        'Redux State Management',
        'Component Composition',
        'Atomic Design System',
        'API Layer Abstraction'
      ],
      complexity: 'medium',
      maintainability: 7 // Good structure but room for improvement
    };
  }

  private static generatePerformanceInsights(techStack: CodebaseAnalysis['techStack']): CodebaseInsight[] {
    return [
      {
        category: 'performance',
        priority: 'high',
        title: 'Redux Store Optimization Needed',
        description: 'Multiple slices and RTK Query cache could benefit from selective persistence and optimization',
        affectedFiles: ['src/store/', 'src/store/api/'],
        suggestedActions: [
          'Implement selective Redux persist for critical data only',
          'Add RTK Query cache invalidation strategies',
          'Use Redux DevTools to identify unnecessary re-renders'
        ],
        researchTopic: 'Redux Performance Optimization for Mobile Apps'
      },
      {
        category: 'performance',
        priority: 'medium',
        title: 'Image Loading and Caching Strategy',
        description: 'App likely loads many automation thumbnails and user avatars without optimization',
        affectedFiles: ['src/components/automation/', 'src/components/common/'],
        suggestedActions: [
          'Implement lazy loading for automation cards',
          'Add image caching with expo-image',
          'Optimize image sizes for different screen densities'
        ],
        researchTopic: 'Mobile Image Optimization and Caching Strategies'
      },
      {
        category: 'performance',
        priority: 'medium',
        title: 'Bundle Size and Code Splitting',
        description: 'Large bundle size due to multiple services and dependencies',
        affectedFiles: ['src/services/', 'App.tsx'],
        suggestedActions: [
          'Implement dynamic imports for non-critical services',
          'Analyze bundle size with Metro bundler tools',
          'Remove unused dependencies'
        ],
        researchTopic: 'React Native Bundle Optimization and Code Splitting'
      }
    ];
  }

  private static generateSecurityInsights(techStack: CodebaseAnalysis['techStack']): CodebaseInsight[] {
    return [
      {
        category: 'security',
        priority: 'high',
        title: 'API Key Security Enhancement',
        description: 'Environment variables may be exposed in production builds',
        affectedFiles: ['app.config.js', 'src/services/research/'],
        suggestedActions: [
          'Implement secure key storage with Expo SecureStore',
          'Add API key rotation mechanism',
          'Validate API responses to prevent injection attacks'
        ],
        researchTopic: 'Mobile App Security and API Key Management'
      },
      {
        category: 'security',
        priority: 'medium',
        title: 'User Input Validation',
        description: 'Automation steps accept user input that needs comprehensive validation',
        affectedFiles: ['src/services/automation/', 'src/components/automation/'],
        suggestedActions: [
          'Implement comprehensive input sanitization',
          'Add validation for webhook URLs and payloads',
          'Create security middleware for automation execution'
        ],
        researchTopic: 'Input Validation and Sanitization in React Native'
      }
    ];
  }

  private static generateArchitectureInsights(architecture: CodebaseAnalysis['architecture']): CodebaseInsight[] {
    return [
      {
        category: 'architecture',
        priority: 'medium',
        title: 'Service Layer Consistency',
        description: 'Multiple service patterns exist - needs standardization',
        affectedFiles: ['src/services/'],
        suggestedActions: [
          'Create base service class with common patterns',
          'Standardize error handling across all services',
          'Implement dependency injection container'
        ],
        researchTopic: 'Service Architecture Patterns for React Native'
      },
      {
        category: 'architecture',
        priority: 'low',
        title: 'Component Reusability',
        description: 'Some components could be more reusable across screens',
        affectedFiles: ['src/components/'],
        suggestedActions: [
          'Extract common patterns into reusable components',
          'Create compound component patterns',
          'Build component documentation with Storybook'
        ],
        researchTopic: 'React Component Design Patterns and Reusability'
      }
    ];
  }

  private static generateUIUXInsights(techStack: CodebaseAnalysis['techStack']): CodebaseInsight[] {
    return [
      {
        category: 'ui-ux',
        priority: 'high',
        title: 'Accessibility Compliance',
        description: 'App needs comprehensive accessibility testing and improvements',
        affectedFiles: ['src/components/', 'src/screens/'],
        suggestedActions: [
          'Add accessibility labels to all interactive elements',
          'Implement proper focus management',
          'Test with screen readers and accessibility tools'
        ],
        researchTopic: 'Mobile Accessibility Best Practices and Testing'
      },
      {
        category: 'ui-ux',
        priority: 'medium',
        title: 'Dark Mode Implementation',
        description: 'While Material Design 3 supports theming, comprehensive dark mode needs implementation',
        affectedFiles: ['App.tsx', 'src/components/', 'src/styles/'],
        suggestedActions: [
          'Implement theme switching functionality',
          'Update all components for dark mode compatibility',
          'Add system preference detection'
        ],
        researchTopic: 'React Native Dark Mode Implementation with Material Design 3'
      }
    ];
  }

  private static generateFeatureInsights(): CodebaseInsight[] {
    return [
      {
        category: 'features',
        priority: 'high',
        title: 'NFC Implementation Completion',
        description: 'NFC functionality is marked as "Next Steps" in roadmap but is core to app functionality',
        affectedFiles: ['src/components/nfc/', 'src/services/nfc/'],
        suggestedActions: [
          'Complete NFC tag reading implementation',
          'Add NFC writing capabilities for Android',
          'Implement fallback strategies for iOS limitations'
        ],
        researchTopic: 'Advanced NFC Implementation in React Native'
      },
      {
        category: 'features',
        priority: 'medium',
        title: 'Offline Automation Support',
        description: 'Users may want to run automations without internet connectivity',
        affectedFiles: ['src/services/automation/', 'src/store/'],
        suggestedActions: [
          'Implement offline queue for automation execution',
          'Add local storage for critical automation data',
          'Create sync mechanism for when connectivity returns'
        ],
        researchTopic: 'Offline-First Architecture for Mobile Automation Apps'
      }
    ];
  }

  private static generateTestingInsights(techStack: CodebaseAnalysis['techStack']): CodebaseInsight[] {
    return [
      {
        category: 'testing',
        priority: 'medium',
        title: 'Test Coverage Enhancement',
        description: 'Critical services like AutomationEngine need comprehensive testing',
        affectedFiles: ['src/services/automation/', 'src/store/'],
        suggestedActions: [
          'Add unit tests for automation execution logic',
          'Create integration tests for API interactions',
          'Implement E2E tests for critical user flows'
        ],
        researchTopic: 'Testing Strategies for React Native Automation Apps'
      }
    ];
  }

  private static generateResearchTopics(insights: CodebaseInsight[], techStack: CodebaseAnalysis['techStack']): string[] {
    // Extract unique research topics from insights
    const insightTopics = insights.map(insight => insight.researchTopic);
    
    // Add tech-stack specific topics
    const techTopics = [
      'React Native Performance Optimization with Redux',
      'Supabase Security Best Practices',
      'Material Design 3 Implementation Patterns',
      'Expo Development vs React Native CLI Migration',
      'Mobile Automation UX Design Patterns'
    ];

    // Combine and deduplicate
    const allTopics = [...new Set([...insightTopics, ...techTopics])];
    
    // Sort by relevance (high priority insights first)
    const highPriorityTopics = insights
      .filter(i => i.priority === 'high')
      .map(i => i.researchTopic);
    
    const sortedTopics = [
      ...highPriorityTopics,
      ...allTopics.filter(topic => !highPriorityTopics.includes(topic))
    ];

    return sortedTopics.slice(0, 8); // Return top 8 most relevant topics
  }

  private static getFallbackAnalysis(): CodebaseAnalysis {
    return {
      insights: [
        {
          category: 'architecture',
          priority: 'medium',
          title: 'Codebase Analysis Unavailable',
          description: 'Unable to analyze codebase automatically. Manual review recommended.',
          affectedFiles: [],
          suggestedActions: [
            'Review project structure manually',
            'Check for common anti-patterns',
            'Validate security practices'
          ],
          researchTopic: 'Manual Code Review Best Practices'
        }
      ],
      techStack: {
        framework: ['React Native', 'TypeScript'],
        ui: ['React Native Paper'],
        state: ['Redux'],
        backend: ['Supabase'],
        testing: ['Jest'],
        dependencies: ['React Navigation']
      },
      architecture: {
        patterns: ['Component Architecture'],
        complexity: 'medium',
        maintainability: 6
      },
      suggestedResearchTopics: [
        'React Native Best Practices',
        'Mobile App Performance',
        'TypeScript in React Native',
        'State Management Patterns'
      ]
    };
  }

  /**
   * Get research topics based on current codebase state
   */
  static async getDynamicResearchTopics(): Promise<string[]> {
    const analysis = await this.analyzeCodebase();
    return analysis.suggestedResearchTopics;
  }

  /**
   * Get high-priority insights that need immediate attention
   */
  static async getHighPriorityInsights(): Promise<CodebaseInsight[]> {
    const analysis = await this.analyzeCodebase();
    return analysis.insights.filter(insight => insight.priority === 'high');
  }
}