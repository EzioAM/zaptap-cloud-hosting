import 'dotenv/config';

export default {
  expo: {
    name: "Zaptap",
    slug: "zaptap",
    owner: "mce_27",
    version: "2.3.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "zaptap",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    plugins: [
      "expo-dev-client",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Zaptap to access your camera for QR code scanning"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Zaptap to use your location for automation triggers"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Zaptap to access your photos for automations"
        }
      ],
      [
        "expo-notifications",
        {
          color: "#8B5CF6",
          defaultChannel: "default",
          mode: "production"
        }
      ]
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zaptap.app",
      icon: "./assets/icon.png",
      associatedDomains: [
        "applinks:zaptap.cloud",
        "applinks:www.zaptap.cloud",
        "applinks:shortcutslike.app"
      ],
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan QR codes for automations.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses location services to trigger location-based automations and provide accurate weather information.",
        NSLocationWhenInUseUsageDescription: "This app uses location services to trigger location-based automations and provide accurate weather information.",
        NSPhotoLibraryUsageDescription: "This app needs access to your photos to select images for automations.",
        NFCReaderUsageDescription: "This app uses NFC to read and write automation tags.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure automation access.",
        NSUserNotificationsUsageDescription: "This app sends push notifications to keep you updated on your automations.",
        "com.apple.developer.nfc.readersession.iso7816.select-identifiers": ["*"],
        "com.apple.developer.nfc.readersession.iso14443.select-identifiers": ["*"],
        ITSAppUsesNonExemptEncryption: false
      },
      entitlements: {
        "com.apple.developer.nfc.readersession.formats": ["NDEF", "TAG"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.zaptap.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.NFC",
        "android.permission.VIBRATE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SEND_SMS"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "zaptap.cloud"
            },
            {
              scheme: "https", 
              host: "www.zaptap.cloud"
            },
            {
              scheme: "https",
              host: "shortcutslike.app"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        },
        {
          action: "VIEW",
          data: [
            {
              scheme: "zaptap"
            },
            {
              scheme: "shortcuts-like"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    platforms: ["ios", "android"],
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/c9104518-2191-4a5a-aa20-76cebb5193cd"
    },
    runtimeVersion: "2.3.1",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      claudeApiKey: process.env.CLAUDE_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
      eas: {
        projectId: "c9104518-2191-4a5a-aa20-76cebb5193cd"
      }
    }
  }
};