export interface UIRedesignRequest {
  screenName: string;
  currentDescription: string;
  designGoals: string[];
  techStack: {
    framework: string;
    uiLibrary: string;
    stateManagement: string;
    navigation: string;
    backend: string;
  };
}

export interface UIRedesignResponse {
  designConcepts: {
    modernizations: string[];
    layoutImprovements: string[];
    interactionEnhancements: string[];
    accessibilityImprovements: string[];
  };
  specificRecommendations: {
    components: string[];
    styling: string[];
    animations: string[];
    userFlow: string[];
  };
  implementationGuide: {
    priority: 'high' | 'medium' | 'low';
    steps: string[];
    codeExamples: string[];
    testingApproach: string[];
  };
  mockupDescriptions: Array<{
    name: string;
    description: string;
    keyFeatures: string[];
    colorScheme: string[];
    layoutChanges: string[];
    userBenefits: string[];
  }>;
}

export class UIRedesignPromptService {
  static generateRedesignPrompt(request: UIRedesignRequest): string {
    const { screenName, currentDescription, designGoals, techStack } = request;

    return `
# UI/UX Redesign Analysis for Mobile Automation App

## Project Context
You are redesigning the **${screenName}** for "Zaptap" - a React Native mobile automation platform that enables users to create, share, and deploy automations via NFC tags, QR codes, and share links.

## Technical Stack
- **Framework**: ${techStack.framework}
- **UI Library**: ${techStack.uiLibrary}  
- **State Management**: ${techStack.stateManagement}
- **Navigation**: ${techStack.navigation}
- **Backend**: ${techStack.backend}

## Current Screen Analysis
${currentDescription}

## Design Goals
The new design should achieve these specific goals:
${designGoals.map(goal => `• ${goal}`).join('\n')}

## Required Analysis

### 1. Design Concept Analysis
Analyze the current implementation and provide:
- **Modernization opportunities**: Specific areas where the UI feels outdated
- **Layout improvements**: Better information hierarchy and visual flow
- **Interaction enhancements**: Smoother gestures, better feedback, micro-interactions
- **Accessibility improvements**: Screen reader support, contrast, touch targets

### 2. Specific Technical Recommendations
Provide actionable recommendations for:
- **Component upgrades**: Which existing components need redesign
- **Styling improvements**: Color schemes, typography, spacing systems
- **Animation opportunities**: Loading states, transitions, success feedback
- **User flow optimizations**: Reduce friction, improve task completion

### 3. Implementation Roadmap
For each recommendation, specify:
- **Priority level**: High/Medium/Low based on user impact
- **Implementation steps**: Specific technical tasks
- **Code patterns**: React Native/TypeScript examples that fit the existing architecture
- **Testing approach**: How to validate improvements

### 4. Design Mockup Specifications
Create detailed descriptions for 3 design mockups that could be generated:

**Mockup 1: Enhanced Current Design**
- Keep existing layout but modernize styling
- Focus on: [specify key improvements]
- Color scheme: [professional color palette]
- Key features: [list 4-5 specific improvements]

**Mockup 2: Reimagined Layout**
- Restructure information architecture
- Focus on: [major layout changes]
- Color scheme: [alternative palette]
- Key features: [list 4-5 major changes]

**Mockup 3: Interaction-Focused Design**
- Emphasize gestures and micro-interactions
- Focus on: [interaction improvements]
- Color scheme: [user-friendly palette]
- Key features: [list 4-5 interaction enhancements]

## Constraints to Consider
- Must work on both iOS and Android
- Should maintain consistency with Material Design 3 (React Native Paper)
- Keep existing Redux state structure
- Preserve current navigation patterns
- Ensure backwards compatibility with existing automations
- Consider NFC/QR scanning integration requirements
- Maintain app performance on lower-end devices

## Response Format
Please structure your response as a detailed analysis covering all sections above. Be specific about technical implementation details that work with React Native and the existing codebase architecture.

Focus on practical, implementable improvements rather than abstract design concepts. Each recommendation should include enough detail for a developer to understand the technical requirements and implementation approach.
    `.trim();
  }

  static parseRedesignResponse(response: string): UIRedesignResponse {
    // Parse the AI response into structured format
    // This is a simplified parser - in production you'd want more robust parsing
    
    const mockupDescriptions = [
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
    ];

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
      mockupDescriptions
    };
  }
}