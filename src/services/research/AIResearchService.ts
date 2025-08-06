import axios from 'axios';
import { UIRedesignRequest, UIRedesignResponse, UIRedesignPromptService } from '../developer/UIRedesignPromptService';
import { EventLogger } from '../../utils/EventLogger';

interface ResearchQuery {
  topic: string;
  context: string;
  specificQuestions?: string[];
}

interface ResearchResult {
  provider: 'claude' | 'chatgpt';
  insights: string[];
  recommendations: string[];
  codeExamples?: string[];
  sources?: string[];
}

export class AIResearchService {
  private claudeApiKey: string;
  private openaiApiKey: string;

  constructor(claudeKey?: string, openaiKey?: string) {
    this.claudeApiKey = claudeKey || '';
    this.openaiApiKey = openaiKey || '';
  }

  /**
   * Query multiple AI providers for app improvement insights
   */
  async researchAppImprovements(query: ResearchQuery): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    EventLogger.debug('AIResearch', '🔍 Starting AI research with keys:', {
      hasClaudeKey: !!this.claudeApiKey && this.claudeApiKey.length > 10,
      hasOpenaiKey: !!this.openaiApiKey && this.openaiApiKey.length > 10,
      claudeKeyPreview: this.claudeApiKey ? this.claudeApiKey.substring(0, 10); + '...' : 'Missing',
      openaiKeyPreview: this.openaiApiKey ? this.openaiApiKey.substring(0, 10) + '...' : 'Missing'
    });

    // Query both AIs in parallel
    const [claudeResult, chatgptResult] = await Promise.allSettled([
      this.queryClaudeAPI(query),
      this.queryChatGPTAPI(query)
    ]);

    EventLogger.debug('AIResearch', '🤖 AI API Results:', {
      claudeStatus: claudeResult.status,
      chatgptStatus: chatgptResult.status,
      claudeError: claudeResult.status === 'rejected' ? claudeResult.reason?.message : null,
      chatgptError: chatgptResult.status === 'rejected' ? chatgptResult.reason?.message : null
    });

    if (claudeResult.status === 'fulfilled') {
      EventLogger.debug('AIResearch', '✅ Claude API succeeded');
      results.push(claudeResult.value);
    } else {
      EventLogger.error('AIResearch', '❌ Claude API failed:', claudeResult.reason as Error);
    }

    if (chatgptResult.status === 'fulfilled') {
      EventLogger.debug('AIResearch', '✅ ChatGPT API succeeded');
      results.push(chatgptResult.value);
    } else {
      EventLogger.error('AIResearch', '❌ ChatGPT API failed:', chatgptResult.reason as Error);
    }

    EventLogger.debug('AIResearch', '📊 Final results: ${results.length} providers responded');
    return results;
  }

  private async queryClaudeAPI(query: ResearchQuery): Promise<ResearchResult> {
    if (!this.claudeApiKey || this.claudeApiKey.length < 10) {
      throw new Error('Claude API key not configured or invalid');
    }

    try {
      EventLogger.debug('AIResearch', '🔮 Calling Claude API...');
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: this.buildResearchPrompt(query)
          }]
        },
        {
          headers: {
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      EventLogger.debug('AIResearch', '✅ Claude API response received');
      return this.parseAIResponse('claude', response.data.content[0].text);
    } catch (error) {
      EventLogger.error('AIResearch', '❌ Claude API error:', error?.response?.data || error?.message || error as Error);
      throw error;
    }
  }

  private async queryChatGPTAPI(query: ResearchQuery): Promise<ResearchResult> {
    if (!this.openaiApiKey || this.openaiApiKey.length < 10) {
      throw new Error('OpenAI API key not configured or invalid');
    }

    try {
      EventLogger.debug('AIResearch', '🤖 Calling ChatGPT API...');
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: this.buildResearchPrompt(query)
          }],
          temperature: 0.7,
          max_tokens: 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      EventLogger.debug('AIResearch', '✅ ChatGPT API response received');
      return this.parseAIResponse('chatgpt', response.data.choices[0].message.content);
    } catch (error) {
      EventLogger.error('AIResearch', '❌ ChatGPT API error:', error?.response?.data || error?.message || error as Error);
      throw error;
    }
  }

  private buildResearchPrompt(query: ResearchQuery): string {
    let prompt = `Research improvements for a mobile automation app with the following context:
    
Topic: ${query.topic}
Context: ${query.context}

Please provide:
1. Key insights and best practices
2. Specific recommendations for improvement
3. Code examples if applicable
4. Relevant industry standards or patterns

Format your response with clear sections for insights, recommendations, and code examples.`;

    if (query.specificQuestions?.length) {
      prompt += '\n\nSpecific questions to address:\n';
      query.specificQuestions.forEach((q, i) => {
        prompt += `${i + 1}. ${q}\n`;
      });
    }

    return prompt;
  }

  private parseAIResponse(provider: 'claude' | 'chatgpt', content: string): ResearchResult {
    // Parse the AI response into structured data
    const insights: string[] = [];
    const recommendations: string[] = [];
    const codeExamples: string[] = [];

    // Simple parsing logic - you can enhance this
    const sections = content.split(/\n\n/);
    let currentSection = '';

    sections.forEach(section => {
      if (section.toLowerCase().includes('insight')) {
        currentSection = 'insights';
      } else if (section.toLowerCase().includes('recommend')) {
        currentSection = 'recommendations';
      } else if (section.toLowerCase().includes('code') || section.includes('```')) {
        currentSection = 'code';
      }

      if (currentSection === 'insights') {
        insights.push(section);
      } else if (currentSection === 'recommendations') {
        recommendations.push(section);
      } else if (currentSection === 'code') {
        codeExamples.push(section);
      }
    });

    return {
      provider,
      insights,
      recommendations,
      codeExamples,
      sources: []
    };
  }

  /**
   * Generate UI/UX redesign recommendations
   */
  async generateUIRedesign(request: UIRedesignRequest): Promise<UIRedesignResponse> {
    try {
      const prompt = UIRedesignPromptService.generateRedesignPrompt(request);
      
      // Try Claude first, then fallback to structured response if API fails
      let aiResponse: string;
      
      if (this.claudeApiKey) {
        try {
          const response = await this.queryClaudeForUIRedesign(prompt);
          aiResponse = response;
        } catch (error) {
          EventLogger.warn('AIResearch', 'Claude API failed, using structured fallback:', error);
          aiResponse = this.generateFallbackUIResponse(request);
        }
      } else {
        aiResponse = this.generateFallbackUIResponse(request);
      }

      return UIRedesignPromptService.parseRedesignResponse(aiResponse);
    } catch (error) {
      EventLogger.error('AIResearch', 'UI redesign generation failed:', error as Error);
      // If parsing fails, return a basic fallback response
      return this.getFallbackUIRedesignResponse(request);
    }
  }

  /**
   * Generate a basic fallback response when everything else fails
   */
  private getFallbackUIRedesignResponse(request: UIRedesignRequest): UIRedesignResponse {
    return {
      designConcepts: {
        modernizations: [
          'Update to Material Design 3 color system',
          'Implement dynamic color theming',
          'Add subtle animations and transitions',
          'Improve visual hierarchy with better typography'
        ],
        layoutImprovements: [
          'Optimize content density for mobile',
          'Implement consistent spacing system',
          'Add proper visual grouping',
          'Improve touch target sizes'
        ],
        interactionEnhancements: [
          'Add haptic feedback for key actions',
          'Implement smooth page transitions',
          'Add loading state animations',
          'Improve gesture recognition'
        ],
        accessibilityImprovements: [
          'Ensure proper color contrast ratios',
          'Add semantic labels for screen readers',
          'Implement focus management',
          'Add alternative text for images'
        ]
      },
      specificRecommendations: {
        components: [
          'Upgrade card components with new elevation system',
          'Implement consistent button styles',
          'Add progress indicators for long operations',
          'Create reusable input components'
        ],
        styling: [
          'Adopt consistent color palette',
          'Implement design token system',
          'Add dark mode support',
          'Create responsive spacing scale'
        ],
        animations: [
          'Add page transition animations',
          'Implement loading state micro-interactions',
          'Create success/error feedback animations',
          'Add smooth scroll behaviors'
        ],
        userFlow: [
          'Simplify navigation paths',
          'Reduce steps for common tasks',
          'Add contextual help and guidance',
          'Implement smart defaults'
        ]
      },
      implementationGuide: {
        priority: 'high',
        steps: [
          'Create new component library with updated styles',
          'Implement design token system',
          'Update existing screens with new components',
          'Add animations and transitions',
          'Test accessibility compliance',
          'Gather user feedback and iterate'
        ],
        codeExamples: [
          'React Native Paper component upgrades',
          'Custom animation implementations',
          'Accessibility helper functions',
          'Theme configuration examples'
        ],
        testingApproach: [
          'Visual regression testing',
          'Accessibility audit',
          'Performance impact analysis',
          'User acceptance testing'
        ]
      },
      mockupDescriptions: [
        {
          name: 'Enhanced Current Design',
          description: 'Modernized version of existing layout with improved styling and micro-interactions',
          keyFeatures: [
            'Updated color scheme with better contrast',
            'Improved typography hierarchy',
            'Enhanced card designs with subtle shadows',
            'Better spacing and visual rhythm'
          ],
          colorScheme: ['#6200EE', '#FFFFFF', '#F5F5F5', '#03DAC6'],
          layoutChanges: [
            'Refined card spacing and padding',
            'Improved header layout',
            'Better button sizing and placement'
          ],
          userBenefits: [
            'Cleaner, more modern appearance',
            'Better readability and focus',
            'Reduced visual clutter'
          ]
        },
        {
          name: 'Reimagined Layout',
          description: 'Complete restructure with new information architecture and improved user flow',
          keyFeatures: [
            'Card-based modular design',
            'Improved navigation patterns',
            'Better content organization',
            'Streamlined user actions'
          ],
          colorScheme: ['#1976D2', '#FFFFFF', '#F8F9FA', '#4CAF50'],
          layoutChanges: [
            'Horizontal scroll sections',
            'Floating action elements',
            'Grouped content areas'
          ],
          userBenefits: [
            'Faster task completion',
            'Intuitive content discovery',
            'Reduced cognitive load'
          ]
        },
        {
          name: 'Interaction-Focused Design',
          description: 'Emphasis on smooth animations, gestures, and responsive feedback',
          keyFeatures: [
            'Gesture-based navigation',
            'Animated state transitions',
            'Haptic feedback integration',
            'Progressive disclosure patterns'
          ],
          colorScheme: ['#9C27B0', '#FFFFFF', '#FAFAFA', '#FF9800'],
          layoutChanges: [
            'Swipe-able card interfaces',
            'Pull-to-refresh enhancements',
            'Dynamic content loading'
          ],
          userBenefits: [
            'More engaging interactions',
            'Faster navigation',
            'Better feedback and confirmation'
          ]
        }
      ]
    };
  }

  private async queryClaudeForUIRedesign(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    return response.data.content[0].text;
  }

  private generateFallbackUIResponse(request: UIRedesignRequest): string {
    const { screenName, designGoals } = request;
    
    return `
# UI/UX Redesign Analysis for ${screenName}

## Design Modernizations
Based on the design goals (${designGoals.join(', ')}), here are key modernization opportunities:

- **Material Design 3 Implementation**: Upgrade to the latest Material Design system with dynamic color theming
- **Improved Visual Hierarchy**: Better typography scale and information architecture
- **Enhanced Spacing System**: Consistent 8pt grid system for better visual rhythm
- **Micro-interactions**: Subtle animations that provide feedback and guide user attention

## Layout Improvements
- **Card-based Design**: Organize content in digestible cards with proper elevation
- **Improved Content Density**: Better balance between information and whitespace
- **Mobile-first Approach**: Optimize touch targets and gesture interactions
- **Progressive Disclosure**: Show relevant information when needed to reduce cognitive load

## Interaction Enhancements
- **Gesture Support**: Implement swipe actions and pull-to-refresh where appropriate
- **Loading States**: Add skeleton screens and progress indicators
- **Haptic Feedback**: Provide tactile confirmation for key actions
- **Smooth Transitions**: Page and component transitions that feel natural

## Implementation Recommendations
- **Component Library**: Create reusable components following design system
- **Theme System**: Implement centralized theming with light/dark mode support
- **Accessibility**: Ensure WCAG compliance with proper contrast and screen reader support
- **Performance**: Optimize animations and transitions for smooth 60fps experience

This analysis provides a foundation for creating three distinct mockup approaches that address different aspects of the user experience.
    `;
  }

  /**
   * Compare insights from multiple AI providers
   */
  async compareAIInsights(topic: string): Promise<{
    consensus: string[];
    uniqueClaudeInsights: string[];
    uniqueChatGPTInsights: string[];
    conflictingViews: string[];
  }> {
    const query: ResearchQuery = {
      topic,
      context: 'Mobile automation app using React Native, NFC, and Supabase'
    };

    const results = await this.researchAppImprovements(query);
    
    const claudeResult = results.find(r => r.provider === 'claude');
    const chatgptResult = results.find(r => r.provider === 'chatgpt');

    // Compare and categorize insights
    const consensus: string[] = [];
    const uniqueClaudeInsights: string[] = [];
    const uniqueChatGPTInsights: string[] = [];
    const conflictingViews: string[] = [];

    // Implementation of comparison logic would go here
    // This is a simplified example

    return {
      consensus,
      uniqueClaudeInsights,
      uniqueChatGPTInsights,
      conflictingViews
    };
  }
}

// Usage example:
export const researchAppFeature = async (feature: string) => {
  const researcher = new AIResearchService(
    process.env.CLAUDE_API_KEY!,
    process.env.OPENAI_API_KEY!
  );

  const results = await researcher.researchAppImprovements({
    topic: feature,
    context: 'Zaptap mobile automation app',
    specificQuestions: [
      'What are the best practices for this feature?',
      'How can we improve user experience?',
      'What security considerations should we address?'
    ]
  });

  return results;
};