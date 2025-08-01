# Changelog

All notable changes to Zaptap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-08-01

### ✨ Added
- **Modern Step Configuration UI**: Complete redesign of automation step customization
  - Bottom sheet modal with smooth spring animations
  - iOS blur effects and cross-platform native feel
  - Icon-based step headers with color-coded information cards
  - Enhanced visual hierarchy with modern typography
- **New UI Components**: 
  - `ModernTextInput` with icons and helper text
  - `ModernSegmentedButtons` with custom styling and icons
  - `InfoCard` component for contextual step explanations
  - `FormSection` for better content organization
- **Enhanced Step Configuration Forms**:
  - SMS: Phone number validation and formatting guidance
  - Email: Input validation with proper keyboard types
  - Webhook: HTTP method selection with visual indicators
  - Location: GPS vs custom location with maps integration
  - Variables: Clear syntax examples and usage instructions
  - Notifications: Modern notification styling
- **Template Preview System**: Read-only template viewing with proper UUID generation
- **Advanced NFC Validation**: UUID format validation to prevent database errors

### 🚀 Improved
- **Cross-Platform Design**: Moved from Android-centric to universal modern design
- **User Experience**: 
  - Contextual help text for each step type
  - Visual feedback with animations and transitions
  - Better error states and validation messages
  - Keyboard-aware layouts on both platforms
- **NFC System**:
  - Proper UUID generation using `react-native-uuid`
  - Invalid NFC tag detection with helpful error messages
  - Template preview protection (prevents NFC writing of unsaved templates)
- **Modal System**: Replaced basic modals with `FullScreenModal` for better UX
- **Performance**: Reduced re-renders with optimized component structure

### 🐛 Fixed
- **Template Preview Crashes**: Fixed `crypto.randomUUID()` not available in React Native
- **NFC Write Crashes**: Resolved modal formatting issues causing app crashes
- **Database UUID Errors**: Fixed "invalid input syntax for type uuid" errors
- **Modal Display Issues**: Eliminated white bars and missing text in quick action modals
- **Old NFC Tag Support**: Graceful handling of legacy automation IDs
- **Template NFC Writing**: Prevented writing of template previews to NFC tags

### 🎨 Design
- **Modern Modal Animations**: Spring-based animations for natural feel
- **Visual Polish**: Improved spacing, colors, and typography
- **Icon System**: Consistent iconography across all step types
- **Responsive Layout**: Better adaptation to different screen sizes
- **Safe Area Handling**: Proper padding for notched devices

## [2.1.2] - 2025-08-01

### ✨ Added
- Universal Links support with zaptap.cloud domain
- Public automation access for unauthenticated users
- Enhanced authentication flow with sign-in prompts

### 🚀 Improved
- NFC automation execution now fetches real data from database
- Template automations are now public by default for NFC sharing
- Better error handling and user feedback in LinkingService
- Enhanced automation engine validation and crash prevention
- Comprehensive logging for debugging NFC and automation issues

### 🐛 Fixed
- NFC automations no longer crash when tapping "Run" button
- Signed-out users can now access public template automations via NFC
- Fixed "Automation not found" error for template automations
- Resolved app force close issues after EAS updates
- Fixed Vercel deployment with proper .well-known files
- Added support for /shared/* URL pattern in Universal Links

## [2.1.1] - 2025-07-30

### 🚀 Improved
- Enhanced NFC tag parsing with comprehensive URI record support
- Added detailed NFC debugging logs for troubleshooting
- Improved NFC tag recognition for both app schemes and web URLs
- Better handling of different NFC record types (URI, Text, Raw)

### 🐛 Fixed
- NFC tags now properly parse web URLs (https://zaptap.app/link/...)
- Fixed URI record parsing with proper prefix code handling
- Resolved NFC parsing failures with enhanced fallback methods
- Text records now properly decode with language code support

## [2.1.0] - 2025-07-30

### ✨ Added
- NFC write functionality for sharing automations
- Dedicated NFC Writer button in automation builder
- Custom full-screen modals for better UX
- Backward compatibility for old NFC tags

### 🚀 Improved
- Rebranded from Shortcuts Like to Zaptap
- Updated app scheme to zaptap://
- Fixed modal layout issues with white bars
- Enhanced NFC tag reading/writing reliability

### 🐛 Fixed
- NFC tags now use correct domain (zaptap.app)
- Modal components display properly without layout issues
- NFC scanner recognizes both old and new tag formats
- Execution count tracking for test automations

## [2.0.0] - 2024-12-15

### ✨ Added
- Complete automation builder with drag-drop interface
- NFC tag reading and writing capabilities
- QR code generation and scanning
- Template gallery with pre-built automations
- Location-based triggers
- User authentication and cloud storage
- Execution tracking and analytics

### 🚀 Improved
- Modern React Native Paper UI
- Redux state management
- Supabase backend integration
- Cross-platform compatibility (iOS/Android)

## [1.0.0] - 2024-10-01

### ✨ Added
- Initial release
- Basic automation engine
- Core step types (notification, delay, variable)
- Simple automation creation