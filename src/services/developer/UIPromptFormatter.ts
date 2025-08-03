export interface DesignInputs {
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

export interface FormattedPrompts {
  claudePrompt: string;
  chatgptPrompt: string;
  imageGenerationPrompt: string;
  searchKeywords: string[];
}

export class UIPromptFormatter {
  /**
   * Format design inputs into optimized prompts for different AI services
   */
  static formatPrompts(inputs: DesignInputs): FormattedPrompts {
    const { screenName, currentDescription, designGoals, techStack } = inputs;

    // Extract key elements for optimization
    const screenType = this.extractScreenType(screenName);
    const primaryGoals = designGoals.slice(0, 5); // Limit to top 5 goals
    const keyComponents = this.extractKeyComponents(currentDescription);

    // Create optimized Claude prompt (detailed, analytical)
    const claudePrompt = this.createClaudePrompt(screenType, primaryGoals, keyComponents, techStack);

    // Create optimized ChatGPT prompt (creative, solution-focused)  
    const chatgptPrompt = this.createChatGPTPrompt(screenType, primaryGoals, keyComponents, techStack);

    // Create image generation prompt for DALL-E/Midjourney
    const imageGenerationPrompt = this.createImagePrompt(screenType, primaryGoals, screenName);

    // Extract search keywords for additional research
    const searchKeywords = this.extractSearchKeywords(screenType, primaryGoals, techStack);

    return {
      claudePrompt,
      chatgptPrompt,
      imageGenerationPrompt,
      searchKeywords
    };
  }

  private static extractScreenType(screenName: string): string {
    const name = screenName.toLowerCase();
    if (name.includes('home')) return 'dashboard';
    if (name.includes('list') || name.includes('automation')) return 'content-list';
    if (name.includes('create') || name.includes('builder')) return 'form-builder';
    if (name.includes('profile')) return 'profile';
    if (name.includes('settings')) return 'settings';
    if (name.includes('scan')) return 'camera-interface';
    return 'mobile-screen';
  }

  private static extractKeyComponents(description: string): string[] {
    const components = [];
    
    if (description.includes('ScrollView')) components.push('scrollable-content');
    if (description.includes('Card')) components.push('card-layout');
    if (description.includes('Button')) components.push('action-buttons');
    if (description.includes('TextInput')) components.push('input-fields');
    if (description.includes('List')) components.push('list-items');
    if (description.includes('Modal')) components.push('modal-dialogs');
    if (description.includes('Tab')) components.push('tab-navigation');
    if (description.includes('Search')) components.push('search-functionality');
    if (description.includes('NFC') || description.includes('QR')) components.push('scanning-interface');

    return components;
  }

  private static createClaudePrompt(screenType: string, goals: string[], components: string[], techStack: any): string {
    return `
ANALYZE AND REDESIGN: ${screenType.replace('-', ' ').toUpperCase()} INTERFACE

**Context**: React Native mobile automation app using ${techStack.uiLibrary} with ${techStack.stateManagement} state management.

**Current Components**: ${components.join(', ')}

**Design Objectives**: ${goals.join(', ')}

**Analysis Required**:
1. **UX Flow Analysis**: Evaluate current user journey and friction points
2. **Visual Hierarchy**: Assess information architecture and content prioritization  
3. **Interaction Patterns**: Review touch targets, gestures, and feedback mechanisms
4. **Accessibility Compliance**: Check WCAG guidelines and screen reader compatibility
5. **Performance Impact**: Consider rendering optimization and animation performance

**Deliverable Format**:
- **Priority Issues**: Top 3 UX problems to solve
- **Design System**: Color palette, typography, spacing recommendations
- **Component Specifications**: Detailed UI component requirements
- **Interaction Design**: Micro-interactions and transition specifications
- **Implementation Roadmap**: Technical steps with React Native code patterns

**Constraints**: 
- Must work on iOS/Android
- Maintain Material Design 3 consistency
- Preserve existing Redux state structure
- Consider offline functionality
- Support dark/light themes

Provide specific, actionable recommendations with technical implementation details.
    `.trim();
  }

  private static createChatGPTPrompt(screenType: string, goals: string[], components: string[], techStack: any): string {
    return `
CREATIVE UI/UX REDESIGN: ${screenType.replace('-', ' ')} for Mobile Automation App

**Challenge**: Transform a ${screenType} interface to achieve: ${goals.join(' + ')}

**Tech Stack**: React Native + ${techStack.uiLibrary} + ${techStack.stateManagement}

**Current Elements**: ${components.join(', ')}

**Creative Brief**:
🎯 **Vision**: Create an intuitive, ${goals[0]} mobile interface that makes automation accessible to everyone

🚀 **Innovation Areas**:
- Revolutionary user interaction patterns
- Cutting-edge visual design trends
- Seamless micro-interaction design
- Progressive disclosure techniques

📱 **Mobile-First Design**:
- Thumb-friendly touch targets
- Gesture-based navigation
- One-handed usability
- Cross-platform consistency

💡 **Breakthrough Ideas**:
- How can we make this ${goals.includes('accessible') ? 'more accessible' : 'more intuitive'}?
- What would make users say "wow" when they use this?
- How can we reduce cognitive load by 50%?

**Deliverables**:
1. **Big Picture Vision**: Revolutionary approach to ${screenType} design
2. **Detailed Mockup Concepts**: 3 distinct visual directions
3. **Interaction Magic**: Specific micro-interactions and animations
4. **User Delight Factors**: Elements that create emotional connection

Focus on innovation, user delight, and modern design trends while staying technically feasible.
    `.trim();
  }

  private static createImagePrompt(screenType: string, goals: string[], screenName: string): string {
    const styleDescriptors = this.getStyleDescriptors(goals);
    const screenContext = this.getScreenContext(screenType);

    return `
mobile app ${screenType} interface design, ${styleDescriptors}, ${screenContext}, 
Material Design 3, React Native app, clean modern UI, professional mobile interface,
${goals.join(' ')} design, mobile automation app, iOS Android compatible,
high fidelity UI mockup, mobile screen design, app interface, 
detailed mobile UI, clean layout, modern typography, proper spacing,
mobile UX design, app design mockup, user interface design
    `.trim();
  }

  private static getStyleDescriptors(goals: string[]): string {
    const descriptors = [];
    
    if (goals.includes('modern')) descriptors.push('contemporary clean modern');
    if (goals.includes('accessible')) descriptors.push('high contrast accessible clear');
    if (goals.includes('intuitive')) descriptors.push('user-friendly simple intuitive');
    if (goals.includes('elegant')) descriptors.push('elegant sophisticated minimal');
    if (goals.includes('professional')) descriptors.push('professional business-like polished');
    if (goals.includes('colorful')) descriptors.push('vibrant colorful engaging');
    if (goals.includes('minimal')) descriptors.push('minimal clean simple');

    return descriptors.length > 0 ? descriptors.join(' ') : 'modern clean professional';
  }

  private static getScreenContext(screenType: string): string {
    const contexts = {
      'dashboard': 'home screen dashboard with cards and quick actions',
      'content-list': 'scrollable list view with search and filter options',
      'form-builder': 'form interface with input fields and action buttons',
      'profile': 'user profile screen with settings and preferences',
      'settings': 'settings screen with toggles and configuration options',
      'camera-interface': 'camera scanning interface with overlay controls',
      'mobile-screen': 'mobile app screen interface'
    };

    return contexts[screenType] || contexts['mobile-screen'];
  }

  private static extractSearchKeywords(screenType: string, goals: string[], techStack: any): string[] {
    const keywords = [
      `${screenType} UI design`,
      `mobile ${screenType} UX`,
      'React Native UI patterns',
      'Material Design 3',
      `${techStack.uiLibrary} components`,
      'mobile app best practices'
    ];

    // Add goal-specific keywords
    goals.forEach(goal => {
      keywords.push(`${goal} mobile UI design`);
      keywords.push(`${goal} UX patterns`);
    });

    return keywords;
  }

  /**
   * Create search query for finding UI inspiration and patterns
   */
  static createSearchQuery(inputs: DesignInputs): string {
    const { screenName, designGoals } = inputs;
    const screenType = this.extractScreenType(screenName);
    
    return `${screenType} mobile UI design ${designGoals.join(' ')} React Native Material Design examples inspiration`;
  }

  /**
   * Format for image generation APIs (DALL-E, Midjourney, etc.)
   */
  static createImageGenerationQuery(inputs: DesignInputs, style: 'enhanced' | 'reimagined' | 'interaction-focused'): string {
    const { screenName, designGoals } = inputs;
    const screenType = this.extractScreenType(screenName);
    const styleModifiers = this.getStyleModifiers(style);
    
    return `${styleModifiers} mobile app ${screenType} interface, ${designGoals.join(' ')} design, Material Design 3, clean modern UI, professional mobile mockup, high fidelity app design`;
  }

  private static getStyleModifiers(style: string): string {
    const modifiers = {
      'enhanced': 'refined polished enhanced modern',
      'reimagined': 'revolutionary innovative reimagined creative', 
      'interaction-focused': 'interactive animated gesture-based dynamic'
    };

    return modifiers[style] || 'modern clean';
  }
}