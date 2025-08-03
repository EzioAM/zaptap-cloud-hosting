# Zaptap Automation Sharing System Guide

## Overview

The Zaptap sharing system enables users to share their automations through multiple channels:
- **NFC Tags** - Write automations to physical NFC tags
- **QR Codes** - Generate scannable QR codes  
- **Web Links** - Share via URLs that work with or without the app
- **Deep Links** - Direct app-to-app sharing

## Architecture

### 1. Smart Link System

The `SmartLinkService` generates intelligent URLs that:
- Open the app if installed (deep linking)
- Redirect to web fallback if app not installed
- Support emergency mode with embedded data
- Work across all sharing methods (NFC, QR, web)

**URL Formats:**
```
# Universal Link (preferred)
https://www.zaptap.cloud/link/{automation-id}

# App Deep Link
zaptap://automation/{automation-id}

# Emergency Link (with embedded data)
https://www.zaptap.cloud/emergency/{automation-id}?data={encoded-data}
```

### 2. NFC Implementation

**Writing to NFC:**
1. Generate smart link via `SmartLinkService`
2. Create NDEF records with:
   - URI record (smart link URL)
   - Text record (automation title)
   - Text record (step count + "Works without app!")
3. Write to NFC tag using `react-native-nfc-manager`

**Reading from NFC:**
1. Parse NDEF records from tag
2. Extract URLs (both app scheme and web URLs)
3. Parse automation ID from URL
4. Fetch automation from database or use embedded data
5. Execute automation or show details

### 3. QR Code Generation

**Components:**
- `QRGenerator` component for UI
- Uses `react-native-qrcode-svg` for rendering
- Supports multiple sizes and error correction levels
- Can generate emergency QR codes with embedded data

**Features:**
- Adjustable size (small/medium/large)
- Error correction levels (L/M/Q/H)
- Share as image functionality
- Copy link to clipboard

### 4. Database Schema

#### Tables:

**automations**
- Stores automation definitions
- Includes sharing settings and access controls
- Supports public/private/password/link-only access

**public_shares**
- Temporary shareable links
- Tracks access count and expiration
- Supports different share types (link/qr/nfc/emergency)

**deployments**
- Associates automations with deployment methods
- Tracks NFC tag writes and QR code generations
- Maintains usage statistics

**executions**
- Logs all automation runs
- Tracks source (app/nfc/qr/web/api)
- Links to deployment method used

**sharing_logs**
- Analytics for sharing activities
- Tracks share methods and recipients

### 5. Security & RLS Policies

**Row Level Security ensures:**
- Users can only modify their own automations
- Public automations are readable by anyone
- Share links respect expiration dates
- Execution logs are private to users

## Implementation Details

### NFC Service Methods

```typescript
// Initialize NFC
await NFCService.initialize();

// Write automation to tag
await NFCService.writeAutomationToNFC(automation);

// Start reading NFC tags
await NFCService.startNFCReader((automationId, metadata) => {
  // Handle found automation
});
```

### Sharing Service Methods

```typescript
// Create public share link
const result = await automationSharingService.createPublicShareLink(automation);

// Share via native dialog
await automationSharingService.shareAutomation(automation, {
  generatePublicLink: true,
  embedData: false,
  emergency: false
});

// Generate emergency link
const emergencyLink = smartLinkService.generateEmergencyLink(automation);
```

### Deep Link Handling

The `LinkingService` handles all incoming links:
1. Parses URL to extract automation ID
2. Validates link format and permissions
3. Fetches automation from database
4. Shows confirmation dialog
5. Executes automation or navigates to details

## Testing

### Manual Testing Steps

1. **NFC Testing:**
   - Write automation to NFC tag
   - Tap tag with app closed
   - Verify automation loads and executes
   - Test with different NFC tag types

2. **QR Code Testing:**
   - Generate QR code for automation
   - Scan with camera app
   - Verify link opens correctly
   - Test emergency QR codes

3. **Web Link Testing:**
   - Share automation via link
   - Open in browser without app
   - Verify web fallback works
   - Test app detection and redirect

4. **Database Testing:**
   - Create public share
   - Verify expiration works
   - Check access counting
   - Test RLS policies

### Automated Testing

Use the `SharingSystemTest` component to run comprehensive tests:
- NFC hardware detection
- Link generation validation
- Database connectivity
- RLS policy verification
- Clipboard operations

## Troubleshooting

### Common Issues

1. **NFC Not Working:**
   - Check device NFC support
   - Verify NFC is enabled in settings
   - Ensure proper permissions granted
   - Try different NFC tag types

2. **Links Not Opening App:**
   - Verify app is installed
   - Check deep link configuration
   - Ensure proper URL schemes registered
   - Test universal links setup

3. **Database Errors:**
   - Check Supabase connection
   - Verify RLS policies
   - Ensure tables exist
   - Check user authentication

4. **QR Code Issues:**
   - Verify QR data encoding
   - Test with different QR readers
   - Check error correction level
   - Ensure proper contrast

## Best Practices

1. **Always use Smart Links** - They provide the best user experience
2. **Test on Real Devices** - Simulators don't support NFC
3. **Handle Offline Scenarios** - Use emergency links when needed
4. **Respect Privacy** - Only share public or owned automations
5. **Monitor Analytics** - Track sharing success rates
6. **Clean Up Expired Shares** - Run maintenance regularly

## Future Enhancements

1. **Bluetooth Sharing** - Direct device-to-device transfer
2. **Widget Support** - Home screen automation widgets  
3. **Social Media Integration** - Native sharing to platforms
4. **Batch Operations** - Write multiple automations to NFC
5. **Advanced Analytics** - Detailed sharing insights