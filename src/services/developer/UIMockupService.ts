export interface MockupGenerationRequest {
  screenName: string;
  designStyle: 'enhanced' | 'reimagined' | 'interaction-focused';
  colorScheme: string[];
  features: string[];
  layoutChanges?: string[];
}

export class UIMockupService {
  /**
   * Generate proper UI mockup URLs for mobile interfaces
   * Uses placeholder services that provide actual mobile UI mockups
   */
  static generateMockupUrl(request: MockupGenerationRequest): string {
    const { screenName, designStyle, colorScheme } = request;
    
    // Create a unique seed based on the request parameters for consistent mockups
    const seed = this.createSeed(screenName, designStyle, colorScheme);
    
    // Use different mockup generation approaches
    switch (designStyle) {
      case 'enhanced':
        return this.generateEnhancedMockup(seed, request);
      case 'reimagined':
        return this.generateReimaginedrMockup(seed, request);
      case 'interaction-focused':
        return this.generateInteractionMockup(seed, request);
      default:
        return this.generateDefaultMockup(seed);
    }
  }

  private static createSeed(screenName: string, designStyle: string, colorScheme: string[]): string {
    // Create a consistent seed for reproducible mockups
    const combined = `${screenName}-${designStyle}-${colorScheme.join('')}`;
    return combined.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  private static generateEnhancedMockup(seed: string, request: MockupGenerationRequest): string {
    // Use Figma Community mockups or UI generators that provide actual mobile interfaces
    // For now, using specialized placeholder services that provide mobile UI mockups
    
    // Based on the screen type, generate appropriate mockup
    const screenType = this.getScreenType(request.screenName);
    
    switch (screenType) {
      case 'list':
        return `https://via.placeholder.com/400x800/FFFFFF/6200EE?text=📱+Enhanced+List+Design%0A%0A🔍+Search+Bar%0A%0A📋+Card+1%0A📋+Card+2%0A📋+Card+3%0A%0A➕+Add+Button`;
      case 'form':
        return `https://via.placeholder.com/400x800/FFFFFF/6200EE?text=📱+Enhanced+Form+Design%0A%0A📝+Input+Field+1%0A📝+Input+Field+2%0A%0A🎯+Design+Goals%0A✨+Modern+✨+Clean%0A%0A💜+Generate+Button`;
      case 'dashboard':
        return `https://via.placeholder.com/400x800/FFFFFF/6200EE?text=📱+Enhanced+Dashboard%0A%0A⚡+Zaptap%0A%0A🤖+🏠+🚨+📝%0A%0A🔧+Build+Automation%0A📋+My+Automations%0A%0A✅+System+Status`;
      case 'profile':
        return `https://via.placeholder.com/400x800/F5F5F5/6200EE?text=📱+Enhanced+Profile%0A%0A👤+User+Avatar%0A📧+user@email.com%0A%0A⚙️+Settings%0A🔒+Privacy%0A📊+Usage%0A%0A🚪+Sign+Out`;
      default:
        return `https://via.placeholder.com/400x800/FFFFFF/6200EE?text=📱+Enhanced+${request.screenName}%0A%0A✨+Modern+Design%0A🎨+Better+Colors%0A📐+Improved+Layout%0A%0A💜+Material+Design+3`;
    }
  }

  private static generateReimaginedrMockup(seed: string, request: MockupGenerationRequest): string {
    const screenType = this.getScreenType(request.screenName);
    const primaryColor = request.colorScheme[0] || '1976D2';
    const bgColor = 'F8F9FA';
    
    switch (screenType) {
      case 'list':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Reimagined+List%0A%0A🔍━━━━━━━━━━━%0A%0A┌─────────────────┐%0A│+🤖+Automation+1+│%0A│+⚡+Quick+Action++│%0A└─────────────────┘%0A%0A┌─────────────────┐%0A│+📋+Automation+2+│%0A└─────────────────┘%0A%0A➕`;
      case 'form':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Reimagined+Form%0A%0A┌─+Screen+Selection+─┐%0A│+🏠+Home+Screen+++++│%0A└─────────────────────┘%0A%0A┌─+Description+──────┐%0A│+Auto-populated++++│%0A│+analysis+here+++++│%0A└─────────────────────┘%0A%0A🎯+modern+accessible%0A%0A🚀+GENERATE`;
      case 'dashboard':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Reimagined+Dashboard%0A%0A━━+⚡+ZAPTAP+━━%0A%0A┌──┐+┌──┐+┌──┐%0A│🤖│+│💼│+│🚨│%0A└──┘+└──┘+└──┘%0A%0A┌──┐+┌──┐+┌──┐%0A│📝│+│🏪│+│📍│%0A└──┘+└──┘+└──┘%0A%0A━━━━━━━━━━━━━━━%0A🔧+BUILD+AUTOMATION`;
      default:
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Reimagined+${request.screenName}%0A%0A🔄+New+Architecture%0A📊+Better+Hierarchy%0A🎯+User-Focused%0A%0A┌─────────────────┐%0A│+Modular+Design++│%0A│+Cards+%26+Sections+│%0A└─────────────────┘`;
    }
  }

  private static generateInteractionMockup(seed: string, request: MockupGenerationRequest): string {
    const screenType = this.getScreenType(request.screenName);
    const primaryColor = request.colorScheme[0] || '9C27B0';
    const bgColor = 'FAFAFA';
    
    switch (screenType) {
      case 'list':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Interactive+List%0A%0A🔍+Search+%28animated%29%0A%0A┌─╭─────────────╮─┐%0A│+│+👆+Swipe+Me++│+│%0A│+│+🤖+Automation│+│%0A│+╰─────────────╯+│%0A└─────────────────┘%0A%0A💫+Smooth+Transitions%0A📳+Haptic+Feedback%0A✨+Micro-animations`;
      case 'form':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Interactive+Form%0A%0A🎭+Screen+Selection%0A┌─────────────────┐%0A│+👆+Tap+to+select+│%0A│+🏠+○+Home+Screen+│%0A└─────────────────┘%0A%0A💬+Smart+Input%0A┌─────────────────┐%0A│+⌨️+Keyboard+flow│%0A│+📝+Auto-complete│%0A└─────────────────┘%0A%0A🚀+Animated+Button`;
      case 'dashboard':
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Interactive+Home%0A%0A⚡+ZAPTAP+%28Animated%29%0A%0A🎭+Gesture+Cards%0A┌──┐+┌──┐+┌──┐%0A│👆│+│👆│+│👆│%0A│🤖│+│💼│+│🚨│%0A└──┘+└──┘+└──┘%0A%0A📳+Haptic+Feedback%0A✨+Smooth+Navigation%0A🌊+Pull+to+Refresh`;
      default:
        return `https://via.placeholder.com/400x800/${bgColor}/${primaryColor}?text=📱+Interactive+${request.screenName}%0A%0A✨+Animations%0A📳+Haptic+Feedback%0A👆+Gesture+Support%0A%0A┌─────────────────┐%0A│+Smooth+60fps++++│%0A│+Transitions+++++│%0A└─────────────────┘%0A%0A💫+Micro-interactions`;
    }
  }

  private static generateDefaultMockup(seed: string): string {
    return `https://via.placeholder.com/400x800/FFFFFF/6200EE?text=📱+Mobile+UI+Mockup%0A%0A🎨+Custom+Design%0A📐+Proper+Layout%0A✨+Modern+Interface%0A%0A💜+Material+Design`;
  }

  private static getScreenType(screenName: string): 'list' | 'form' | 'dashboard' | 'profile' | 'settings' | 'other' {
    const name = screenName.toLowerCase();
    
    if (name.includes('home')) return 'dashboard';
    if (name.includes('list') || name.includes('automation')) return 'list';
    if (name.includes('create') || name.includes('builder') || name.includes('redesign')) return 'form';
    if (name.includes('profile')) return 'profile';
    if (name.includes('settings')) return 'settings';
    
    return 'other';
  }

  /**
   * Generate multiple mockup variations for a single screen
   */
  static generateMockupSet(baseRequest: MockupGenerationRequest): Array<MockupGenerationRequest & { imageUrl: string }> {
    const styles: Array<'enhanced' | 'reimagined' | 'interaction-focused'> = ['enhanced', 'reimagined', 'interaction-focused'];
    
    return styles.map(style => {
      const request = { ...baseRequest, designStyle: style };
      return {
        ...request,
        imageUrl: this.generateMockupUrl(request)
      };
    });
  }
}