export const APP_VERSION = '2.3.1';
export const APP_NAME = 'Zaptap';
export const APP_TAGLINE = 'Automate Your World';

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: {
    added?: string[];
    improved?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.3.0',
    date: '2025-08-01',
    type: 'minor',
    changes: {
      added: [
        'Version History System - Track all automation changes with restore capability',
        'Analytics Dashboard - Comprehensive usage insights and performance metrics',
        'Comments System - Full social interaction with threaded conversations',
        'Professional UI modals for advanced features',
        'New database tables with Row Level Security'
      ],
      improved: [
        'Gallery automation details now show full feature set',
        'Eye icon opens comprehensive AutomationDetails screen',
        'Enhanced automation discovery with complete feature access',
        'Responsive design with pull-to-refresh and loading states',
        'Contextual menus and action buttons for enhanced usability'
      ],
      fixed: [
        'Gear icon modal showing only white bar',
        'Step descriptions now human-readable instead of JSON',
        'Gallery screen formatting issues',
        'Navigation route names for proper screen transitions'
      ]
    }
  },
  {
    version: '2.1.2',
    date: '2025-08-01',
    type: 'patch',
    changes: {
      added: [
        'Universal Links support with zaptap.cloud domain',
        'Public automation access for unauthenticated users',
        'Enhanced authentication flow with sign-in prompts'
      ],
      improved: [
        'NFC automation execution now fetches real data from database',
        'Template automations are now public by default for NFC sharing',
        'Better error handling and user feedback in LinkingService',
        'Enhanced automation engine validation and crash prevention',
        'Comprehensive logging for debugging NFC and automation issues'
      ],
      fixed: [
        'NFC automations no longer crash when tapping "Run" button',
        'Signed-out users can now access public template automations via NFC',
        'Fixed "Automation not found" error for template automations',
        'Resolved app force close issues after EAS updates',
        'Fixed Vercel deployment with proper .well-known files',
        'Added support for /shared/* URL pattern in Universal Links'
      ]
    }
  },
  {
    version: '2.1.1',
    date: '2025-07-30',
    type: 'patch',
    changes: {
      improved: [
        'Enhanced NFC tag parsing with comprehensive URI record support',
        'Added detailed NFC debugging logs for troubleshooting',
        'Improved NFC tag recognition for both app schemes and web URLs',
        'Better handling of different NFC record types (URI, Text, Raw)'
      ],
      fixed: [
        'NFC tags now properly parse web URLs (https://zaptap.app/link/...)',
        'Fixed URI record parsing with proper prefix code handling',
        'Resolved NFC parsing failures with enhanced fallback methods',
        'Text records now properly decode with language code support'
      ]
    }
  },
  {
    version: '2.1.0',
    date: '2025-07-30',
    type: 'minor',
    changes: {
      added: [
        'NFC write functionality for sharing automations',
        'Dedicated NFC Writer button in automation builder',
        'Custom full-screen modals for better UX',
        'Backward compatibility for old NFC tags'
      ],
      improved: [
        'Rebranded from Shortcuts Like to Zaptap',
        'Updated app scheme to zaptap://',
        'Fixed modal layout issues with white bars',
        'Enhanced NFC tag reading/writing reliability'
      ],
      fixed: [
        'NFC tags now use correct domain (zaptap.app)',
        'Modal components display properly without layout issues',
        'NFC scanner recognizes both old and new tag formats',
        'Execution count tracking for test automations'
      ]
    }
  },
  {
    version: '2.0.0',
    date: '2024-12-15',
    type: 'major',
    changes: {
      added: [
        'Complete automation builder with drag-drop interface',
        'NFC tag reading and writing capabilities',
        'QR code generation and scanning',
        'Template gallery with pre-built automations',
        'Location-based triggers',
        'User authentication and cloud storage',
        'Execution tracking and analytics'
      ],
      improved: [
        'Modern React Native Paper UI',
        'Redux state management',
        'Supabase backend integration',
        'Cross-platform compatibility (iOS/Android)'
      ]
    }
  },
  {
    version: '1.0.0',
    date: '2024-10-01',
    type: 'major',
    changes: {
      added: [
        'Initial release',
        'Basic automation engine',
        'Core step types (notification, delay, variable)',
        'Simple automation creation'
      ]
    }
  }
];

export const getLatestChangelog = (): ChangelogEntry => CHANGELOG[0];

export const getChangelogByVersion = (version: string): ChangelogEntry | undefined => 
  CHANGELOG.find(entry => entry.version === version);

export const formatChangelog = (entry: ChangelogEntry): string => {
  let formatted = `## Version ${entry.version} (${entry.date})\n\n`;
  
  if (entry.changes.added && entry.changes.added.length > 0) {
    formatted += '### ✨ Added\n';
    entry.changes.added.forEach(item => formatted += `- ${item}\n`);
    formatted += '\n';
  }
  
  if (entry.changes.improved && entry.changes.improved.length > 0) {
    formatted += '### 🚀 Improved\n';
    entry.changes.improved.forEach(item => formatted += `- ${item}\n`);
    formatted += '\n';
  }
  
  if (entry.changes.fixed && entry.changes.fixed.length > 0) {
    formatted += '### 🐛 Fixed\n';
    entry.changes.fixed.forEach(item => formatted += `- ${item}\n`);
    formatted += '\n';
  }
  
  if (entry.changes.removed && entry.changes.removed.length > 0) {
    formatted += '### 🗑️ Removed\n';
    entry.changes.removed.forEach(item => formatted += `- ${item}\n`);
    formatted += '\n';
  }
  
  return formatted;
};