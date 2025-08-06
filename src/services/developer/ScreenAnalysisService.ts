// React Native service for analyzing screen contents

import { EventLogger } from '../../utils/EventLogger';
export interface ScreenAnalysis {
  components: string[];
  layout: string;
  features: string[];
  styling: string;
  interactivity: string[];
  dataFlow: string[];
}

export class ScreenAnalysisService {
  private static screenMappings: Record<string, string> = {
    'HomeScreen': 'App.tsx', // HomeScreen is embedded in App.tsx
    'ProfileScreen': 'src/screens/profile/ProfileScreen.tsx', // May not exist yet
    'SettingsScreen': 'src/screens/settings/SettingsScreen.tsx', // May not exist yet
    'AutomationListScreen': 'src/screens/automation/MyAutomationsScreen.tsx',
    'CreateAutomationScreen': 'src/screens/automation/AutomationBuilderScreen.tsx',
    'ScanScreen': 'src/components/qr/QRScanner.tsx', // No dedicated screen, using component
  };

  static async analyzeScreen(screenName: string): Promise<string> {
    try {
      const analysis = await this.getScreenAnalysis(screenName);
      return this.formatAnalysisForAI(screenName, analysis);
    } catch (error) {
      EventLogger.error('Analysis', 'Failed to analyze ${screenName}:', error as Error);
      return this.getFallbackDescription(screenName);
    }
  }

  static async getScreenAnalysis(screenName: string): Promise<ScreenAnalysis> {
    const filePath = this.screenMappings[screenName];
    
    if (!filePath) {
      throw new Error(`No mapping found for ${screenName}`);
    }

    // For HomeScreen, provide a detailed analysis based on what we know
    if (screenName === 'HomeScreen') {
      return {
        components: [
          'SafeAreaView with ScrollView',
          'RefreshControl for pull-to-refresh',
          'Header with app title and version',
          'Feature grid with 6 cards (Essentials, Productivity, Emergency, Templates, Gallery, Location Triggers)',
          'Authentication section (Sign In/Sign Up buttons when not authenticated)',
          'User section with welcome message and action buttons when authenticated',
          'System status indicators',
          'Debug components (only in dev mode)'
        ],
        layout: 'Vertical ScrollView with: Header > Feature Grid (2 columns) > Actions Section > Status Section',
        features: [
          'Pull-to-refresh functionality',
          'Feature card navigation',
          'Authentication state management',
          'Developer access detection',
          'Version display with modal',
          'Dynamic content based on auth state'
        ],
        styling: 'Material Design inspired with card-based layout, elevation shadows, purple/teal color scheme (#6200ee, #03dac6)',
        interactivity: [
          'Feature cards navigate to different screens',
          'Authentication buttons for sign in/up',
          'Action buttons for authenticated users',
          'Pull-to-refresh gesture',
          'Version info tap to show details'
        ],
        dataFlow: [
          'Redux state for authentication',
          'RoleService for developer access',
          'Navigation service for deep linking',
          'Version constants from external file'
        ]
      };
    }

    if (screenName === 'AutomationListScreen') {
      return {
        components: [
          'Appbar with search and filter',
          'Searchbar for filtering automations',
          'Filter chips (all, recent, favorites)',
          'ScrollView with RefreshControl',
          'Card components for each automation',
          'FAB for creating new automation',
          'NFC Scanner/Writer modals'
        ],
        layout: 'Appbar > Search > Filter Chips > ScrollView of Automation Cards > FAB',
        features: [
          'Search functionality across title/description',
          'Filter by recent, favorites, all',
          'Pull-to-refresh',
          'Delete automation with confirmation',
          'NFC tag reading/writing for automations',
          'Navigation to automation details'
        ],
        styling: 'Card-based layout with Material Design components, elevation shadows, consistent spacing',
        interactivity: [
          'Search input with real-time filtering',
          'Filter chip selection',
          'Card tap to view details',
          'Swipe actions for delete',
          'FAB to create new automation',
          'NFC scanner modal'
        ],
        dataFlow: [
          'RTK Query for fetching automations from Supabase',
          'Local state for search and filters',
          'NFC service integration',
          'Navigation with parameters'
        ]
      };
    }

    if (screenName === 'CreateAutomationScreen') {
      return {
        components: [
          'Appbar with save/back actions',
          'Title input field (editable)',
          'Draggable step list',
          'Step picker modal',
          'Step configuration modals',
          'QR Generator/Scanner modals',
          'NFC Scanner/Writer modals',
          'Share automation modal',
          'FAB for adding steps'
        ],
        layout: 'Appbar > Title Input > Step List (draggable) > FAB + Modals',
        features: [
          'Drag and drop step reordering',
          'Multiple step types (notification, SMS, email, webhook, delay, variable)',
          'Step configuration with validation',
          'QR code generation for sharing',
          'NFC tag writing capabilities',
          'Save automation to cloud',
          'Template preview mode'
        ],
        styling: 'Clean interface with draggable cards, Material Design inputs, consistent spacing',
        interactivity: [
          'Drag and drop step reordering',
          'Step configuration modals',
          'Add/remove/edit steps',
          'Title editing inline',
          'Modal overlays for tools',
          'Execution testing'
        ],
        dataFlow: [
          'Local state for automation steps',
          'RTK Query mutations for saving',
          'AutomationEngine for execution',
          'QR/NFC services for sharing',
          'Supabase for data persistence'
        ]
      };
    }

    // For screens that might not exist yet
    return this.getPlaceholderAnalysis(screenName);
  }

  private static getPlaceholderAnalysis(screenName: string): ScreenAnalysis {
    const baseAnalysis = {
      components: ['Basic screen structure', 'Navigation header', 'Content area'],
      layout: 'Standard mobile screen layout',
      features: ['Basic navigation', 'Content display'],
      styling: 'Material Design theme consistency',
      interactivity: ['Navigation gestures', 'Basic user interactions'],
      dataFlow: ['Standard React Native state management']
    };

    switch (screenName) {
      case 'ProfileScreen':
        return {
          ...baseAnalysis,
          components: ['Profile header', 'User avatar', 'User information cards', 'Settings links', 'Sign out button'],
          features: ['User profile display', 'Account settings access', 'Authentication management'],
          interactivity: ['Edit profile fields', 'Settings navigation', 'Sign out action']
        };
      
      case 'SettingsScreen':
        return {
          ...baseAnalysis,
          components: ['Settings categories', 'Toggle switches', 'Selection lists', 'Preference inputs'],
          features: ['App preferences', 'Notification settings', 'Theme selection', 'Data management'],
          interactivity: ['Toggle preferences', 'Select options', 'Input validation']
        };
      
      case 'ScanScreen':
        return {
          ...baseAnalysis,
          components: ['Camera view', 'Scan overlay', 'Result display', 'Action buttons'],
          features: ['QR code scanning', 'NFC tag reading', 'Automation execution', 'Scan history'],
          interactivity: ['Camera permissions', 'Scan detection', 'Result actions']
        };
      
      default:
        return baseAnalysis;
    }
  }

  private static formatAnalysisForAI(screenName: string, analysis: ScreenAnalysis): string {
    return `
**${screenName} Current Implementation:**

**Components & Layout:**
${analysis.layout}

**Key Components:**
${analysis.components.map(comp => `• ${comp}`).join('\n')}

**Current Features:**
${analysis.features.map(feature => `• ${feature}`).join('\n')}

**Styling Approach:**
${analysis.styling}

**User Interactions:**
${analysis.interactivity.map(interaction => `• ${interaction}`).join('\n')}

**Data Flow & State:**
${analysis.dataFlow.map(flow => `• ${flow}`).join('\n')}

**Technical Context:**
- Built with React Native and TypeScript
- Uses React Native Paper for Material Design 3 components
- Redux Toolkit for state management with RTK Query for API calls
- Supabase backend for data persistence
- React Navigation 6 for navigation
- Custom services for NFC, QR, and automation execution

This analysis provides context for generating design improvements that are technically feasible and maintain consistency with the existing architecture.
    `.trim();
  }

  private static getFallbackDescription(screenName: string): string {
    const fallbacks: Record<string, string> = {
      'HomeScreen': 'Main dashboard with feature cards, authentication controls, and system status. Uses card-based layout with Material Design styling.',
      'ProfileScreen': 'User profile screen (to be implemented) - would typically show user information, settings access, and account management.',
      'SettingsScreen': 'App settings screen (to be implemented) - would contain app preferences, theme selection, and configuration options.',
      'AutomationListScreen': 'List of user automations with search, filtering, and management capabilities. Card-based layout with NFC integration.',
      'CreateAutomationScreen': 'Automation builder with drag-and-drop steps, configuration modals, and sharing capabilities. Complex workflow-based interface.',
      'ScanScreen': 'QR/NFC scanning interface (component-based) - camera overlay with scan detection and automation execution.',
    };

    return fallbacks[screenName] || `${screenName} - Standard mobile screen with navigation and content areas.`;
  }
}