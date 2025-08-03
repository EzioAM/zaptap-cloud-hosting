import { Platform } from 'react-native';

export interface ImageGenerationRequest {
  prompt: string;
  style: 'enhanced' | 'reimagined' | 'interaction-focused';
  screenType: string;
  designGoals: string[];
  screenContext?: {
    components: string[];
    layout: string;
    features: string[];
    styling: string;
    interactivity: string[];
  };
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
      console.log('🎨 Generating mockup image:', {
        style: request.style,
        screenType: request.screenType,
        hasApiKey: !!this.dalleApiKey,
        hasContext: !!request.screenContext
      });
      
      // Try AI generation first if API key is available
      if (this.dalleApiKey) {
        console.log('🤖 Attempting DALL-E generation...');
        return await this.generateWithDALLE(request);
      } else {
        // Fallback to sophisticated UI mockups
        console.log('🖼️ Using placeholder generation (no API key)...');
        return this.generateAdvancedPlaceholder(request);
      }
    } catch (error) {
      console.error('❌ Image generation failed, using fallback:', error);
      console.error('Error details:', error.message, error.stack);
      try {
        return this.generateAdvancedPlaceholder(request);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Return a basic error image
        return {
          url: 'https://via.placeholder.com/400x800/ff0000/ffffff?text=Error',
          prompt: request.prompt,
          style: request.style,
          isAIGenerated: false
        };
      }
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
    const { prompt, style, screenType, designGoals, screenContext } = request;
    
    // Build context-aware prompt if screen context is available
    let contextualDetails = '';
    if (screenContext) {
      contextualDetails = `
Screen contains: ${screenContext.components.slice(0, 5).join(', ')}.
Layout: ${screenContext.layout}.
Key features: ${screenContext.features.slice(0, 3).join(', ')}.
Styling: ${screenContext.styling}.
`;
    }
    
    // Optimize for DALL-E mobile UI generation with context
    const optimized = `
Professional mobile app UI mockup for ${screenType}, ${style} design variation.
${contextualDetails}
${designGoals.join(' and ')} design principles.
Material Design 3 system, modern mobile interface,
clean layouts with proper typography, realistic mobile screen mockup,
high quality app design, contemporary mobile interface,
detailed UI elements showing ${screenContext?.components[0] || 'interface elements'},
professional app mockup with ${screenContext?.styling || 'modern styling'}
    `.trim().replace(/\s+/g, ' ');

    return optimized;
  }

  private static generateAdvancedPlaceholder(request: ImageGenerationRequest): GeneratedImage {
    const { style, screenType, designGoals, screenContext } = request;
    
    try {
      console.log('🎨 Generating placeholder mockup...');
      
      // For React Native, use a more reliable approach
      if (Platform.OS !== 'web') {
        // Use local assets or simpler placeholder that works reliably in React Native
        const mockupUrl = this.createReactNativeMockup(style, screenType, designGoals);
        console.log('📱 React Native mockup URL:', mockupUrl);
        return {
          url: mockupUrl,
          prompt: request.prompt,
          style,
          isAIGenerated: false
        };
      }
      
      // For web, use the existing placeholder services
      const mockupUrl = this.createAdvancedMockupUrl(style, screenType, designGoals, screenContext);
      
      console.log('✅ Placeholder URL generated:', mockupUrl);
      
      return {
        url: mockupUrl,
        prompt: request.prompt,
        style,
        isAIGenerated: false
      };
    } catch (error) {
      console.error('❌ Error in generateAdvancedPlaceholder:', error);
      throw error;
    }
  }

  private static createAdvancedMockupUrl(style: string, screenType: string, designGoals: string[], screenContext?: any): string {
    try {
      console.log('🎯 Creating mockup URL for style:', style);
      
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

      const url = selectedService.call(this, screenType, designGoals, style, screenContext);
      console.log('📍 Generated URL:', url);
      return url;
    } catch (error) {
      console.error('❌ Error in createAdvancedMockupUrl:', error);
      throw error;
    }
  }

  private static createMaterialDesignMockup(screenType: string, designGoals: string[], style: string, screenContext?: any): string {
    try {
      // Create Material Design style mockups
      const baseUrl = 'https://via.placeholder.com/400x800';
      const colors = this.getColorScheme(style, designGoals);
      
      // Use simpler text for placeholder services
      const simpleText = `${screenType.replace(/([A-Z])/g, ' $1').trim()}\nMaterial Design`;
      
      return `${baseUrl}/${colors.background}/${colors.primary}?text=${encodeURIComponent(simpleText)}`;
    } catch (error) {
      console.error('Error in createMaterialDesignMockup:', error);
      // Return a basic fallback
      return 'https://via.placeholder.com/400x800/6200EE/FFFFFF?text=Material+Design';
    }
  }

  private static createFigmaStyleMockup(screenType: string, designGoals: string[], style: string, screenContext?: any): string {
    try {
      // Create Figma-style mockups with better layouts
      const baseUrl = 'https://dummyimage.com/400x800';
      const colors = this.getColorScheme(style, designGoals);
      
      // Use simpler text for placeholder services
      const simpleText = `${screenType.replace(/([A-Z])/g, ' $1').trim()}\nFigma Style`;
      
      return `${baseUrl}/${colors.background}/${colors.primary}.png&text=${encodeURIComponent(simpleText)}`;
    } catch (error) {
      console.error('Error in createFigmaStyleMockup:', error);
      // Return a basic fallback
      return 'https://dummyimage.com/400x800/1976D2/FFFFFF.png&text=Figma+Style';
    }
  }

  private static createSketchStyleMockup(screenType: string, designGoals: string[], style: string, screenContext?: any): string {
    try {
      // Create Sketch-style mockups with emphasis on interactions
      const colors = this.getColorScheme(style, designGoals);
      
      // Use simpler text for placeholder services
      const simpleText = `${screenType.replace(/([A-Z])/g, ' $1').trim()}\nInteractive`;
      
      // Use a service that supports more complex layouts
      return `https://fakeimg.pl/400x800/${colors.background}/${colors.primary}/?text=${encodeURIComponent(simpleText)}&font=arial`;
    } catch (error) {
      console.error('Error in createSketchStyleMockup:', error);
      // Return a basic fallback
      return 'https://fakeimg.pl/400x800/9C27B0/FFFFFF/?text=Interactive&font=arial';
    }
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

  private static generateMockupContent(screenType: string, designStyle: string, designGoals: string[], screenContext?: any): string {
    const isModern = designGoals.includes('modern');
    const isMinimal = designGoals.includes('minimal');
    const isAccessible = designGoals.includes('accessible');

    // Map screen names to mockup types
    const screenTypeMap: Record<string, string> = {
      'homescreen': 'dashboard',
      'automationlistscreen': 'content-list',
      'createautomationscreen': 'form-builder',
      'profilescreen': 'profile',
      'settingsscreen': 'settings',
      'scanscreen': 'scanner'
    };

    const mappedType = screenTypeMap[screenType.toLowerCase()] || screenType;

    switch (mappedType) {
      case 'dashboard':
        return this.generateDashboardMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      case 'content-list':
        return this.generateListMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      case 'form-builder':
        return this.generateFormMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      case 'profile':
        return this.generateProfileMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      case 'settings':
        return this.generateSettingsMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      case 'scanner':
        return this.generateScannerMockup(designStyle, { isModern, isMinimal, isAccessible }, screenContext);
      default:
        return this.generateDefaultMockup(screenType, designStyle, { isModern, isMinimal, isAccessible }, screenContext);
    }
  }

  private static generateDashboardMockup(style: string, flags: any, screenContext?: any): string {
    const { isModern, isMinimal } = flags;
    
    // Extract actual components from context if available
    const hasFeatureGrid = screenContext?.components?.some((c: string) => c.includes('Feature grid'));
    const hasAuth = screenContext?.components?.some((c: string) => c.includes('Authentication'));
    const hasRefresh = screenContext?.features?.includes('Pull-to-refresh functionality');
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Enhanced'} Home\n\n⚡ ZAPTAP${hasRefresh ? ' ↻' : ''}\n\n${hasFeatureGrid ? '┌─🤖 Essentials─┐ ┌─💼 Work─┐\n┌─🚨 Emergency─┐ ┌─📝 Templates─┐\n┌─🏪 Gallery─┐ ┌─📍 Location─┐' : '🤖 💼 🚨\n📝 🏪 📍'}\n\n${hasAuth ? '🔐 Sign In / Sign Up' : '👤 Welcome User'}\n📋 My Automations\n✅ System Status`;
    } else if (style === 'figma') {
      return `📱 Reimagined Home\n\n━━ ⚡ ZAPTAP ━━\n\n${hasFeatureGrid ? '╭─ ESSENTIALS ─╮ ╭─ PRODUCTIVITY ─╮\n│ 🤖 Automate  │ │ 💼 Workflows   │\n╰──────────────╯ ╰────────────────╯\n\n╭─ EMERGENCY ──╮ ╭─ TEMPLATES ────╮\n│ 🚨 Quick SOS │ │ 📝 Pre-built   │\n╰──────────────╯ ╰────────────────╯' : '╭─────╮ ╭─────╮ ╭─────╮\n│ 🤖  │ │ 💼  │ │ 🚨  │\n╰─────╯ ╰─────╯ ╰─────╯'}\n\n${hasAuth ? '━━━━━━━━━━━━━━━━━━━━━\n🔑 AUTHENTICATE' : '━━━━━━━━━━━━━━━━━━━━━\n🚀 CREATE AUTOMATION'}`;
    } else {
      return `📱 Interactive Home\n\n⚡ ZAPTAP ${hasRefresh ? '(Pull ↓)' : ''}\n\n${hasFeatureGrid ? '🎯 Feature Cards (6)\n┌─ Tap & Hold ──┐ ┌─ 3D Touch ────┐\n│ 🤖 Essentials │ │ 💼 Productivity│\n│ ⚡ Quick setup │ │ 📊 Analytics   │\n└───────────────┘ └────────────────┘' : '🎭 Tap to Explore\n┌──────┐ ┌──────┐ ┌──────┐\n│  👆  │ │  👆  │ │  👆  │\n└──────┘ └──────┘ └──────┘'}\n\n${hasAuth ? '🔐 Biometric Login' : '📳 Haptic Feedback'}\n✨ ${screenContext?.styling?.includes('Material') ? 'Material You' : 'Smooth Animations'}`;
    }
  }

  private static generateListMockup(style: string, flags: any, screenContext?: any): string {
    const { isModern, isAccessible } = flags;
    
    // Extract actual components from context
    const hasSearch = screenContext?.components?.some((c: string) => c.includes('Searchbar'));
    const hasFilters = screenContext?.components?.some((c: string) => c.includes('Filter chips'));
    const hasFAB = screenContext?.components?.some((c: string) => c.includes('FAB'));
    const hasNFC = screenContext?.features?.some((f: string) => f.includes('NFC'));
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Enhanced'} Automations\n\n${hasSearch ? '🔍 Search Automations' : '📋 My Automations'}\n${hasFilters ? '⭐ All  📅 Recent  ❤️ Favorites' : ''}\n\n┌─────────────────────┐\n│ 🤖 Morning Routine  │\n│ ⏰ Runs at 7:00 AM  │\n│ ${isAccessible ? '●●●●○' : '★★★★☆'} 4.5 (12 reviews) │\n${hasNFC ? '│ 🏷️ NFC Enabled      │' : ''}\n└─────────────────────┘\n\n┌─────────────────────┐\n│ 💼 Work Setup       │\n│ 📍 Location trigger │\n│ ${isAccessible ? '●●●●●' : '★★★★★'} 5.0 (8 reviews)  │\n└─────────────────────┘\n\n${hasFAB ? '➕ Create Automation' : '🚀 Add New'}`;
    } else if (style === 'figma') {
      return `📱 Reimagined Library\n\n${hasSearch ? '🔍━━━━━━━━━━━━━━━━━━' : '━━ MY AUTOMATIONS ━━'}\n${hasFilters ? '┌─All─┐ ┌─Recent─┐ ┌─❤️─┐' : ''}\n\n╭─ 🤖 SMART ROUTINE ─╮\n│ Morning Automation  │\n│ 📊 15 runs/week    │\n│ ⚡ 2.3s avg time    │\n${hasNFC ? '│ 🏷️ Tap to execute  │' : '│ 🎯 Productivity    │'}\n╰────────────────────╯\n\n╭─ 💼 WORK FLOW ────╮\n│ Office Arrival     │\n│ 📊 5 runs/week     │\n│ 📍 Geo-triggered   │\n╰────────────────────╯\n\n${hasFAB ? '━━━━━━━━━━━━━━━━━━━━━\n➕ CREATE NEW' : '🚀 BUILD AUTOMATION'}`;
    } else {
      return `📱 Interactive Library\n\n${hasSearch ? '🔍 AI-Powered Search' : '📚 Automation List'}\n${hasFilters ? '🎯 Smart Filters' : ''}\n\n┌─ Swipe & Interact ─┐\n│ ← 🗑️  🤖 Morning  ⚙️ → │\n│   Daily routine     │\n${hasNFC ? '│   🏷️ NFC: Tap phone │' : '│   👆 Tap to run    │'}\n│   💫 3D Touch menu  │\n└────────────────────┘\n\n┌─ Gesture Controls ─┐\n│ ← ❤️  💼 Work    📊 → │\n│   Location-based   │\n│   📳 Haptic ready  │\n└────────────────────┘\n\n${hasFAB ? '➕ Floating Action' : '✨ Smooth Animations'}\n🌊 Pull to Refresh`;
    }
  }

  private static generateFormMockup(style: string, flags: any, screenContext?: any): string {
    const { isModern, isAccessible } = flags;
    
    // Extract actual components from context
    const hasDragDrop = screenContext?.features?.some((f: string) => f.includes('Drag and drop'));
    const hasStepTypes = screenContext?.features?.some((f: string) => f.includes('Multiple step types'));
    const hasQR = screenContext?.components?.some((c: string) => c.includes('QR Generator'));
    const hasNFC = screenContext?.components?.some((c: string) => c.includes('NFC'));
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Enhanced'} Builder\n\n✏️ Automation Name\n┌─────────────────────┐\n│ Morning Routine     │\n└─────────────────────┘\n\n${hasDragDrop ? '🔀 Drag to Reorder:' : '📋 Steps:'}\n┌─ 1. Notification ──┐\n│ 📱 "Good morning!" │\n${hasDragDrop ? '│ ≡ ↕️ Drag handle   │' : ''}\n└────────────────────┘\n\n┌─ 2. Smart Home ───┐\n│ 💡 Turn on lights  │\n└────────────────────┘\n\n${hasStepTypes ? '➕ Add: 📱 📧 🌐 ⏱️ 📊' : '➕ Add Step'}\n${hasQR || hasNFC ? '\n🔧 Deploy: 📷 QR | 🏷️ NFC' : ''}`;
    } else if (style === 'figma') {
      return `📱 Reimagined Builder\n\n✏️ Name Your Flow\n╭─────────────────────╮\n│ Type automation...  │\n╰─────────────────────╯\n\n${hasDragDrop ? '🔀 VISUAL WORKFLOW' : '📋 STEP BUILDER'}\n╭─ Step 1 ⋮⋮⋮ ──────╮\n│ 📱 Send Alert      │\n│ Message: Welcome!  │\n${hasDragDrop ? '│ ↕️ Drag to reorder │' : '│ ⚙️ Configure       │'}\n╰────────────────────╯\n  ↓\n╭─ Step 2 ⋮⋮⋮ ──────╮\n│ 🏠 Smart Action    │\n│ Device: Lights     │\n╰────────────────────╯\n\n${hasStepTypes ? '━━━━━━━━━━━━━━━━━━━━━\n➕ ADD STEP' : '➕ New Action'}\n${hasQR ? '📷 Generate QR' : ''} ${hasNFC ? '🏷️ Write NFC' : ''}`;
    } else {
      return `📱 Interactive Builder\n\n✏️ Smart Title Input\n┌─────────────────────┐\n│ 💡 AI suggestions...│\n└─────────────────────┘\n\n${hasDragDrop ? '🎯 Drag & Drop Canvas' : '📋 Step Editor'}\n┌─ Draggable Card ───┐\n│ 📱 Notification    │\n│ 🔄 Swipe actions   │\n${hasDragDrop ? '│ 👆 Hold to drag    │' : '│ 👆 Tap to edit     │'}\n│ 💫 3D Touch menu   │\n└────────────────────┘\n  ⚡\n┌─ Interactive Step ─┐\n│ 🏠 Smart Home      │\n│ 📳 Haptic feedback │\n└────────────────────┘\n\n${hasStepTypes ? '➕ Rich Step Library' : '➕ Add Action'}\n${hasQR || hasNFC ? '🔧 Share: QR • NFC • Link' : '✨ Preview Mode'}`;
    }
  }

  private static generateProfileMockup(style: string, flags: any, screenContext?: any): string {
    const { isModern } = flags;
    
    // Use context if available
    const hasAvatar = screenContext?.components?.some((c: string) => c.includes('avatar'));
    const hasSettings = screenContext?.components?.some((c: string) => c.includes('Settings'));
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Classic'} Profile\n\n┌─────────────────────┐\n│    ${hasAvatar ? '📸 Photo' : '👤 Avatar'}      │\n│   user@email.com    │\n│   Premium Member    │\n└─────────────────────┘\n\n${hasSettings ? '⚙️ Account Settings' : '⚙️ Settings'}\n🔒 Privacy & Security\n📊 Usage Analytics\n🎨 Theme Preferences\n🏷️ My NFC Tags\n\n━━━━━━━━━━━━━━━━━━━━━\n🚪 Sign Out`;
    } else if (style === 'figma') {
      return `📱 Reimagined Profile\n\n╭─────────────────────╮\n│     ${hasAvatar ? '📸' : '👤'} Profile     │\n│  @username          │\n│  ⭐ Pro User        │\n╰─────────────────────╯\n\n╭─ QUICK STATS ──────╮\n│ 📊 15 Automations  │\n│ 🏷️ 8 NFC Tags      │\n│ ⚡ 125 Runs/Week    │\n╰────────────────────╯\n\n━━━━━━━━━━━━━━━━━━━━━\n⚙️ Settings\n🔐 Security\n🎨 Appearance\n━━━━━━━━━━━━━━━━━━━━━\n🚪 LOG OUT`;
    } else {
      return `📱 Interactive Profile\n\n┌─ 3D Profile Card ──┐\n│    ${hasAvatar ? '📸 Animated' : '👤 Avatar'}    │\n│   Tap to edit ✏️    │\n│   🌟 Level 5       │\n└────────────────────┘\n\n🎯 Achievements (12)\n📊 Stats Dashboard\n🏷️ NFC Collection\n🔧 Quick Actions\n\n✨ Swipe for more →\n\n━━━━━━━━━━━━━━━━━━━━━\n🚪 Biometric Logout`;
    }
  }

  private static generateDefaultMockup(screenType: string, style: string, flags: any, screenContext?: any): string {
    // Use context to make more relevant mockups
    const components = screenContext?.components?.slice(0, 3).join(', ') || 'UI Components';
    const layout = screenContext?.layout || 'Standard Layout';
    const features = screenContext?.features?.slice(0, 2) || ['Interactive', 'Responsive'];
    
    return `📱 ${screenType.replace('-', ' ').toUpperCase()}\n\n🎨 ${style.toUpperCase()} Design\n\n┌─────────────────────┐\n│ ${layout}          │\n│ ${flags.isModern ? 'Modern' : 'Enhanced'} Interface │\n│ ${flags.isAccessible ? '♿ Accessible' : '✨ Beautiful'}       │\n└─────────────────────┘\n\n📦 ${components}\n🚀 ${features.join(' • ')}\n\n✨ Professional UI\n📐 Consistent Design\n🎯 User-Centered`;
  }

  private static generateSettingsMockup(style: string, flags: any, screenContext?: any): string {
    const { isModern, isAccessible } = flags;
    const hasToggles = screenContext?.components?.some((c: string) => c.includes('Toggle'));
    
    if (style === 'material') {
      return `📱 ${isModern ? 'Modern' : 'Classic'} Settings\n\n⚙️ GENERAL\n┌─────────────────────┐\n│ 🔔 Notifications  ○│\n│ 🌙 Dark Mode      ●│\n│ 📍 Location       ○│\n└─────────────────────┘\n\n🔐 PRIVACY & SECURITY\n┌─────────────────────┐\n│ 🔒 Biometric Login ●│\n│ 🔑 2FA Auth        ○│\n└─────────────────────┘\n\n📊 DATA & STORAGE\n🗑️ Clear Cache\n💾 Backup Data`;
    } else {
      return `📱 Settings Hub\n\n━━ PREFERENCES ━━━━━━\n${hasToggles ? '🔔 Alerts      [●━○]' : '🔔 Notifications ○'}\n🌙 Theme       [○━●]\n📍 Location    [●━○]\n\n━━ SECURITY ━━━━━━━━━\n🔐 Biometrics  [●━○]\n🔑 2FA         [○━●]\n\n━━ ADVANCED ━━━━━━━━━\n🧪 Beta Features\n🔧 Developer Mode\n📊 Analytics`;
    }
  }

  private static generateScannerMockup(style: string, flags: any, screenContext?: any): string {
    const hasQR = screenContext?.features?.some((f: string) => f.includes('QR'));
    const hasNFC = screenContext?.features?.some((f: string) => f.includes('NFC'));
    
    if (style === 'material') {
      return `📱 Scanner View\n\n┌─────────────────────┐\n│                     │\n│   📷 Camera Feed    │\n│                     │\n│  ┌─────────────┐   │\n│  │             │   │\n│  │  ${hasQR ? 'QR TARGET' : 'SCAN AREA'}  │   │\n│  │             │   │\n│  └─────────────┘   │\n│                     │\n└─────────────────────┘\n\n${hasNFC ? '🏷️ NFC: Hold Near Tag' : ''}\n${hasQR ? '📷 Point at QR Code' : ''}\n\n⚡ Recent: Morning Flow`;
    } else {
      return `📱 Smart Scanner\n\n╭─────────────────────╮\n│   📹 Live Preview   │\n│  ╭───────────╮     │\n│  │           │     │\n│  │ ${hasQR && hasNFC ? 'QR + NFC' : hasQR ? 'QR CODE' : 'SCANNER'} │     │\n│  │           │     │\n│  ╰───────────╯     │\n│ ✨ AI Detection     │\n╰─────────────────────╯\n\n${hasNFC ? '🏷️ NFC Ready' : ''}\n${hasQR ? '📸 QR Scanner' : ''}\n🎯 Auto-Execute\n\n📋 History (5)`;
    }
  }
  
  private static createReactNativeMockup(style: string, screenType: string, designGoals: string[]): string {
    // Use a simple, reliable placeholder for React Native
    const colors = this.getColorScheme(style, designGoals);
    const styleName = style.charAt(0).toUpperCase() + style.slice(1);
    const screenName = screenType.replace(/([A-Z])/g, ' $1').trim();
    
    // First try external services
    try {
      const services = [
        `https://placehold.co/400x800/${colors.background}/${colors.primary}/png?text=${encodeURIComponent(screenName)}`,
        `https://via.placeholder.com/400x800/${colors.background}/${colors.primary}.png?text=${encodeURIComponent(styleName)}`,
        `https://dummyimage.com/400x800/${colors.background}/${colors.primary}.png&text=${encodeURIComponent('Mockup')}`
      ];
      
      // Return the first service URL
      return services[0];
    } catch (error) {
      console.warn('Failed to generate external URL, using data URI fallback');
      // If all else fails, return a data URI that will always work
      return this.createDataUriPlaceholder(style, screenType);
    }
  }
  
  private static createDataUriPlaceholder(style: string, screenType: string): string {
    // Create a simple SVG data URI that will always work
    const colors = this.getColorScheme(style, []);
    const text = screenType.replace(/([A-Z])/g, ' $1').trim();
    
    const svg = `
      <svg width="400" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="800" fill="#${colors.background}"/>
        <text x="200" y="400" font-family="Arial" font-size="24" fill="#${colors.primary}" text-anchor="middle">
          ${text}
        </text>
        <text x="200" y="440" font-family="Arial" font-size="18" fill="#${colors.primary}" text-anchor="middle">
          ${style} Design
        </text>
      </svg>
    `.trim();
    
    // Convert to data URI - btoa might not be available in React Native
    try {
      const dataUri = `data:image/svg+xml;base64,${btoa(svg)}`;
      return dataUri;
    } catch (error) {
      // If btoa is not available, use URL encoding instead
      const encodedSvg = encodeURIComponent(svg);
      return `data:image/svg+xml,${encodedSvg}`;
    }
  }
}