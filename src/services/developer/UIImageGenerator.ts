export interface ImageGenerationRequest {
  prompt: string;
  style: 'enhanced' | 'reimagined' | 'interaction-focused';
  screenType: string;
  designGoals: string[];
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  style: string;
  isAIGenerated: boolean;
}

export class UIImageGenerator {
  private static dalleApiKey: string;

  static setApiKey(apiKey: string) {
    this.dalleApiKey = apiKey;
  }

  /**
   * Generate UI mockup images using AI or sophisticated placeholders
   */
  static async generateMockupImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    try {
      // Try AI generation first if API key is available
      if (this.dalleApiKey) {
        return await this.generateWithDALLE(request);
      } else {
        // Fallback to sophisticated UI mockups
        return this.generateAdvancedPlaceholder(request);
      }
    } catch (error) {
      console.error('Image generation failed, using fallback:', error);
      return this.generateAdvancedPlaceholder(request);
    }
  }

  private static async generateWithDALLE(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const optimizedPrompt = this.optimizePromptForDALLE(request);
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.dalleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: optimizedPrompt,
        n: 1,
        size: "512x1024", // Mobile aspect ratio
        quality: "hd",
        style: "natural"
      }),
    });

    const data = await response.json();
    
    if (data.data && data.data[0]) {
      return {
        url: data.data[0].url,
        prompt: optimizedPrompt,
        style: request.style,
        isAIGenerated: true
      };
    } else {
      throw new Error('DALL-E generation failed');
    }
  }

  private static optimizePromptForDALLE(request: ImageGenerationRequest): string {
    const { prompt, style, screenType, designGoals } = request;
    
    // Optimize for DALL-E mobile UI generation
    const optimized = `
Professional mobile app UI mockup, ${screenType} interface design, 
${designGoals.join(' and ')} design principles, 
Material Design 3 system, modern mobile interface,
clean layouts, proper typography, realistic mobile screen,
high quality app design mockup, ${style} style,
mobile UX design, contemporary mobile interface,
detailed UI elements, professional app mockup
    `.trim().replace(/\s+/g, ' ');

    return optimized;
  }

  private static generateAdvancedPlaceholder(request: ImageGenerationRequest): GeneratedImage {
    const { style, screenType, designGoals } = request;
    
    // Generate sophisticated placeholder using UI mockup services
    const mockupUrl = this.createAdvancedMockupUrl(style, screenType, designGoals);
    
    return {
      url: mockupUrl,
      prompt: request.prompt,
      style,
      isAIGenerated: false
    };
  }

  private static createAdvancedMockupUrl(style: string, screenType: string, designGoals: string[]): string {
    // Use multiple placeholder services for better variety
    const services = [
      this.createFigmaStyleMockup,
      this.createSketchStyleMockup,
      this.createMaterialDesignMockup
    ];

    // Select service based on style
    let selectedService;
    switch (style) {
      case 'enhanced':
        selectedService = this.createMaterialDesignMockup;
        break;
      case 'reimagined':
        selectedService = this.createFigmaStyleMockup;
        break;
      case 'interaction-focused':
        selectedService = this.createSketchStyleMockup;
        break;
      default:
        selectedService = this.createMaterialDesignMockup;
    }

    return selectedService(screenType, designGoals, style);
  }

  private static createMaterialDesignMockup(screenType: string, designGoals: string[], style: string): string {
    // Create Material Design style mockups
    const baseUrl = 'https://via.placeholder.com/400x800';
    const colors = this.getColorScheme(style, designGoals);
    
    const content = this.generateMockupContent(screenType, 'material', designGoals);
    
    return `${baseUrl}/${colors.background}/${colors.primary}?text=${encodeURIComponent(content)}`;
  }

  private static createFigmaStyleMockup(screenType: string, designGoals: string[], style: string): string {
    // Create Figma-style mockups with better layouts
    const baseUrl = 'https://dummyimage.com/400x800';
    const colors = this.getColorScheme(style, designGoals);
    
    const content = this.generateMockupContent(screenType, 'figma', designGoals);
    
    return `${baseUrl}/${colors.background}/${colors.primary}.png&text=${encodeURIComponent(content)}`;
  }

  private static createSketchStyleMockup(screenType: string, designGoals: string[], style: string): string {
    // Create Sketch-style mockups with emphasis on interactions
    const colors = this.getColorScheme(style, designGoals);
    const content = this.generateMockupContent(screenType, 'sketch', designGoals);
    
    // Use a service that supports more complex layouts
    return `https://fakeimg.pl/400x800/${colors.background}/${colors.primary}/?text=${encodeURIComponent(content)}&font=arial`;
  }

  private static getColorScheme(style: string, designGoals: string[]): { background: string; primary: string; accent: string } {
    // Determine colors based on style and goals
    if (designGoals.includes('dark') || style === 'enhanced') {
      return { background: '1F1F1F', primary: 'BB86FC', accent: '03DAC6' };
    } else if (style === 'reimagined') {
      return { background: 'F8F9FA', primary: '1976D2', accent: '4CAF50' };
    } else if (style === 'interaction-focused') {
      return { background: 'FAFAFA', primary: '9C27B0', accent: 'FF9800' };
    } else {
      return { background: 'FFFFFF', primary: '6200EE', accent: '03DAC6' };
    }
  }

  private static generateMockupContent(screenType: string, designStyle: string, designGoals: string[]): string {
    const isModern = designGoals.includes('modern');
    const isMinimal = designGoals.includes('minimal');
    const isAccessible = designGoals.includes('accessible');

    switch (screenType) {
      case 'dashboard':
        return this.generateDashboardMockup(designStyle, { isModern, isMinimal, isAccessible });
      case 'content-list':
        return this.generateListMockup(designStyle, { isModern, isMinimal, isAccessible });
      case 'form-builder':
        return this.generateFormMockup(designStyle, { isModern, isMinimal, isAccessible });
      case 'profile':
        return this.generateProfileMockup(designStyle, { isModern, isMinimal, isAccessible });
      default:
        return this.generateDefaultMockup(screenType, designStyle, { isModern, isMinimal, isAccessible });
    }
  }

  private static generateDashboardMockup(style: string, flags: any): string {
    const { isModern, isMinimal } = flags;
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Enhanced'} Dashboard\n\n⚡ ZAPTAP\n\n${isMinimal ? '🤖 💼 🚨' : '┌─🤖─┐ ┌─💼─┐ ┌─🚨─┐'}\n${isMinimal ? '📝 🏪 📍' : '┌─📝─┐ ┌─🏪─┐ ┌─📍─┐'}\n\n🔧 BUILD AUTOMATION\n📋 MY AUTOMATIONS\n\n✅ System Status`;
    } else if (style === 'figma') {
      return `📱 Reimagined Home\n\n━━ ⚡ ZAPTAP ━━\n\n╭─────╮ ╭─────╮ ╭─────╮\n│ 🤖  │ │ 💼  │ │ 🚨  │\n│Auto │ │Work │ │Emrg │\n╰─────╯ ╰─────╯ ╰─────╯\n\n╭─────╮ ╭─────╮ ╭─────╮\n│ 📝  │ │ 🏪  │ │ 📍  │\n│Tmpl │ │Shop │ │ Loc │\n╰─────╯ ╰─────╯ ╰─────╯\n\n━━━━━━━━━━━━━━━━━━━━━\n🚀 CREATE AUTOMATION`;
    } else {
      return `📱 Interactive Dashboard\n\n⚡ ZAPTAP (Animated)\n\n🎭 Tap to Explore\n┌──────┐ ┌──────┐ ┌──────┐\n│  👆  │ │  👆  │ │  👆  │\n│  🤖  │ │  💼  │ │  🚨  │\n│ Auto │ │ Work │ │ Help │\n└──────┘ └──────┘ └──────┘\n\n📳 Haptic Feedback\n✨ Smooth Animations\n🌊 Pull to Refresh`;
    }
  }

  private static generateListMockup(style: string, flags: any): string {
    const { isModern, isAccessible } = flags;
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Enhanced'} List\n\n🔍 Search Automations\n\n┌─────────────────────┐\n│ 🤖 Morning Routine  │\n│ ⚡ Quick Actions     │\n│ ${isAccessible ? '●●●●○' : '★★★★☆'} 4.5/5        │\n└─────────────────────┘\n\n┌─────────────────────┐\n│ 📋 Work Setup       │\n│ 🔧 Productivity     │\n│ ${isAccessible ? '●●●●●' : '★★★★★'} 5.0/5        │\n└─────────────────────┘\n\n➕ Add New Automation`;
    } else if (style === 'figma') {
      return `📱 Reimagined List\n\n🔍━━━━━━━━━━━━━━━━━━\n\n╭─ 🤖 AUTOMATION 1 ──╮\n│ ⚡ Quick Morning     │\n│ 📊 Usage: 15x/week  │\n│ 🎯 Productivity     │\n╰─────────────────────╯\n\n╭─ 📋 AUTOMATION 2 ──╮\n│ 🏢 Work Prep        │\n│ 📊 Usage: 5x/week   │\n│ 💼 Professional     │\n╰─────────────────────╯\n\n━━━━━━━━━━━━━━━━━━━━━\n🚀 CREATE NEW`;
    } else {
      return `📱 Interactive List\n\n🔍 Smart Search (AI)\n\n┌─ Swipe Actions ────┐\n│ ← 🗑️  🤖 Auto1  ⚙️ → │\n│   Morning Routine   │\n│   👆 Tap to Run     │\n└─────────────────────┘\n\n┌─ Gesture Ready ────┐\n│ ← ❤️  📋 Auto2  📊 → │\n│   Work Setup        │\n│   📳 Haptic Ready   │\n└─────────────────────┘\n\n✨ Smooth Animations\n🌊 Pull to Refresh`;
    }
  }

  private static generateFormMockup(style: string, flags: any): string {
    const { isModern, isAccessible } = flags;
    
    return `📱 ${isModern ? 'Modern' : 'Smart'} Form\n\n🎯 Screen Selection\n┌─────────────────────┐\n│ ○ Home Screen       │\n│ ● ${style === 'material' ? 'List Screen' : 'Content List'}     │\n│ ○ Profile Screen    │\n└─────────────────────┘\n\n📝 UI Description\n┌─────────────────────┐\n│ Auto-populated...   │\n│ ${isAccessible ? 'Screen reader ready' : 'Smart analysis'}   │\n│ ${style === 'figma' ? 'AI-powered insights' : 'Context aware'}   │\n└─────────────────────┘\n\n🎨 Design Goals\n${isModern ? '✨ modern' : '🎯 enhanced'} ${isAccessible ? '♿ accessible' : '🎨 beautiful'}\n\n🚀 GENERATE REDESIGN`;
  }

  private static generateProfileMockup(style: string, flags: any): string {
    return `📱 Profile Design\n\n┌─────────────────────┐\n│       👤 Avatar     │\n│   user@email.com    │\n└─────────────────────┘\n\n⚙️ Settings\n🔒 Privacy\n📊 Usage Stats\n🎨 Preferences\n\n━━━━━━━━━━━━━━━━━━━━━\n🚪 Sign Out`;
  }

  private static generateDefaultMockup(screenType: string, style: string, flags: any): string {
    return `📱 ${screenType.replace('-', ' ').toUpperCase()}\n\n🎨 ${style.toUpperCase()} Style\n\n┌─────────────────────┐\n│   Custom Design     │\n│   ${flags.isModern ? 'Modern' : 'Enhanced'} Layout     │\n│   ${flags.isAccessible ? 'Accessible' : 'Beautiful'} UI       │\n└─────────────────────┘\n\n✨ Professional Design\n📐 Proper Spacing\n🎯 User-Focused`;
  }
}