# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZapTap (formerly Shortcuts Like v2) - A React Native/Expo mobile automation platform that enables users to create, share, and deploy automations via NFC tags, QR codes, and share links.

## Development Commands

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS device/simulator
npm run ios
# Or clean build
npm run ios:clean

# Run on Android device/emulator  
npm run android
# Or clean build
npm run android:clean

# Start with specific platform
npm run dev:ios      # iOS only
npm run dev:android  # Android only
npm run dev:both     # Both platforms
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# Platform-specific tests
npm run test:ios
npm run test:android

# Debug mode (no cache, verbose)
npm run test:debug
```

### Building & Deployment
```bash
# EAS Build (requires EAS CLI setup)
npm run build:ios         # iOS development build
npm run build:android     # Android development build
npm run build:preview     # Preview builds for both platforms

# EAS Updates
npm run update:preview    # Deploy preview update
npm run update:development # Deploy development update

# Bundle optimization
npm run analyze:bundle    # Analyze bundle size
npm run optimize:bundle   # Optimize production bundle
```

### Database & Backend
```bash
# Supabase operations
npm run supabase:setup    # Setup database roles
npm run supabase:verify   # Verify configuration
npm run supabase:grant    # Grant permissions
npm run supabase:list     # List current setup

# Database testing
npm run test:db           # Test database connection
npm run test:auth         # Test authentication flow
```

## Architecture

### Technology Stack
- **Framework**: React Native 0.79.5 with Expo SDK 53
- **Language**: TypeScript (strict mode enabled)
- **State Management**: Redux Toolkit with RTK Query
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **UI Library**: React Native Paper (Material Design 3)
- **Forms**: react-hook-form with yup validation
- **Navigation**: React Navigation 6 (bottom tabs + stack navigators)
- **Animations**: Reanimated 3
- **Testing**: Jest with React Native Testing Library

### Project Structure
```
src/
├── components/
│   ├── atoms/         # Basic UI elements (Button, Card, Badge)
│   ├── molecules/     # Composite components (AutomationCard)
│   ├── organisms/     # Complex sections (DashboardWidgets, StepEditor)
│   └── templates/     # Page layouts
├── screens/
│   ├── modern/        # Main app screens (Home, Discover, Library, Profile)
│   ├── automation/    # Automation-specific screens
│   ├── auth/          # Authentication screens
│   └── settings/      # Settings and configuration
├── services/
│   ├── automation/    # AutomationEngine and step executors
│   ├── nfc/          # NFC tag reading/writing
│   ├── qr/           # QR code generation/scanning
│   ├── supabase/     # Database client configuration
│   └── security/     # Input validation and sanitization
├── store/
│   ├── slices/       # Redux slices (auth, automation, deployment, scan, ui)
│   └── api/          # RTK Query API endpoints
├── navigation/       # Navigation configuration
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

### Core Services

1. **AutomationEngine** (`src/services/automation/AutomationEngine.ts`)
   - Executes automation workflows with step types: SMS, Email, Webhook, Notification, Delay, Variable, Location, etc.
   - Each executor in `src/services/automation/executors/` handles specific action types

2. **NFCService** (`src/services/nfc/NFCService.ts`, `NFCManager.ts`)
   - Handles NFC tag reading/writing with permission management
   - Safe wrapper available at `SafeNFCService.ts`

3. **QRService** (`src/services/qr/QRService.ts`)
   - QR code scanning and generation for automation sharing

4. **SecurityService** (`src/services/security/SecurityService.ts`)
   - Validates and sanitizes user inputs
   - Detects and blocks dangerous operations
   - Enforces HTTPS for network requests

5. **SupabaseClient** (`src/services/supabase/client.ts`)
   - Configured instance for auth and database operations
   - Row Level Security (RLS) policies for access control

### State Management

Redux store slices:
- **authSlice**: User authentication and profile state
- **automationSlice**: Automation data and execution state
- **deploymentSlice**: NFC/QR deployment management
- **scanSlice**: Scanning state and results
- **uiSlice**: UI preferences and state
- **offlineSlice**: Offline queue management
- **notificationSlice**: Push notification state

RTK Query APIs:
- **automationApi**: CRUD operations for automations
- **analyticsApi**: Usage tracking and insights
- **dashboardApi**: Dashboard data fetching

### Security & Validation

- All user inputs sanitized via SecurityService
- Network requests restricted to HTTPS
- Local network access blocked for webhooks
- Dangerous operations require user confirmation
- Access controls: public/private/password-protected automations
- RLS policies on all database tables

### Platform Configuration

**iOS** (`ios/Zaptap/`):
- Bundle ID: `com.zaptap.app`
- Scheme: `zaptap://`
- Location permissions for weather features
- WeatherKit integration (Swift module)

**Android** (`android/`):
- Package: `com.zaptap.app`
- Location permissions configured
- NFC permissions in manifest

### Environment Variables

Required `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema

Main tables (with RLS policies):
- `users` - User profiles
- `automations` - Workflow definitions
- `automation_steps` - Individual actions
- `deployments` - NFC/QR mappings
- `executions` - Run history
- `execution_summary` - Aggregated stats
- `reviews` - Community ratings
- `comments` - User feedback

### Testing Strategy

Jest configuration in `package.json`:
- Preset: `jest-expo`
- Setup file: `__tests__/utils/setupTests.ts`
- Coverage threshold: 70% for all metrics
- Platform-specific tests supported via `PLATFORM_OS` env var

### Key Implementation Notes

1. **Dual Navigation**: App uses both bottom tabs and stack navigation
2. **Theme System**: Material Design 3 with light/dark mode support
3. **Performance**: Bundle optimization with metro cache and minification
4. **Error Handling**: Smart error suppression for network issues
5. **Offline Support**: Queue system for offline operations
6. **Deep Linking**: Universal links configured for `zaptap://` scheme