import { Platform } from 'react-native';

export const PlatformUtils = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  
  // Platform-specific configurations
  nfcConfig: {
    enabled: Platform.OS === 'ios' || Platform.OS === 'android',
    backgroundReadingSupported: Platform.OS === 'ios',
    tagWritingSupported: true,
  },
  
  cameraConfig: {
    qrScanningSupported: true,
    barcodeFormats: Platform.select({
      ios: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'code128'],
      android: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'code128', 'code39'],
      default: ['qr']
    }),
  },
  
  locationConfig: {
    backgroundLocationSupported: true,
    geofencingSupported: Platform.OS === 'ios' || Platform.OS === 'android',
    accuracyOptions: Platform.select({
      ios: ['low', 'balanced', 'high', 'navigation'],
      android: ['low', 'balanced', 'high'],
      default: ['balanced']
    }),
  },
  
  smsConfig: {
    supported: Platform.OS === 'ios' || Platform.OS === 'android',
    attachmentsSupported: Platform.select({
      ios: true,
      android: false, // Android SMS typically doesn't support attachments in the same way
      default: false
    }),
  },
  
  // UI/UX differences
  ui: {
    statusBarHeight: Platform.select({
      ios: 44,
      android: 24,
      default: 24
    }),
    navigationBarHeight: Platform.select({
      ios: 88,
      android: 56,
      default: 56
    }),
    defaultPadding: Platform.select({
      ios: 16,
      android: 16,
      default: 16
    }),
  },
  
  // Feature availability
  features: {
    faceId: Platform.OS === 'ios',
    fingerprint: Platform.OS === 'android',
    pushNotifications: true,
    deepLinking: true,
    shortcuts: Platform.OS === 'ios', // iOS Shortcuts integration
    widgets: Platform.OS === 'ios' || Platform.OS === 'android',
  },
  
  // Platform-specific implementations
  getStoragePath: () => Platform.select({
    ios: 'Documents/',
    android: 'DCIM/ShortcutsLike/',
    default: 'Documents/'
  }),
  
  getShareOptions: () => Platform.select({
    ios: {
      title: 'Share Automation',
      subject: 'Check out this automation!',
      message: 'I created an automation with Shortcuts Like',
    },
    android: {
      title: 'Share Automation',
      dialogTitle: 'Share via',
    },
    default: {
      title: 'Share Automation'
    }
  }),
  
  // Check if vector icons are supported
  areVectorIconsSupported: () => {
    try {
      require('react-native-vector-icons/MaterialCommunityIcons');
      return true;
    } catch (error) {
      return false;
    }
  },
};