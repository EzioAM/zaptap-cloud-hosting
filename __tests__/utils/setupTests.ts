import '@testing-library/jest-native/extend-expect';

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  RN.NativeModules = {
    ...RN.NativeModules,
    NFCManager: {
      start: jest.fn().mockResolvedValue(true),
      stop: jest.fn().mockResolvedValue(true),
      isSupported: jest.fn().mockResolvedValue(true),
      isEnabled: jest.fn().mockResolvedValue(true),
      requestTechnology: jest.fn().mockResolvedValue(true),
      getTag: jest.fn().mockResolvedValue({ id: 'test-tag' }),
      cancelTechnologyRequest: jest.fn().mockResolvedValue(true),
      setEventListener: jest.fn(),
      registerTagEvent: jest.fn().mockResolvedValue(true),
      unregisterTagEvent: jest.fn().mockResolvedValue(true),
      goToNfcSetting: jest.fn(),
      ndefHandler: {
        writeNdefMessage: jest.fn().mockResolvedValue(true),
      },
    },
  };

  RN.Alert = {
    alert: jest.fn(),
  };

  RN.Share = {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
  };

  RN.Platform = {
    OS: 'ios',
    select: jest.fn(options => options.ios),
  };

  return RN;
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(true),
  removeItem: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(true),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(true),
  multiRemove: jest.fn().mockResolvedValue(true),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
    },
  }),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));

// Mock react-native-nfc-manager
jest.mock('react-native-nfc-manager', () => ({
  default: {
    start: jest.fn().mockResolvedValue(true),
    isSupported: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockResolvedValue(true),
    requestTechnology: jest.fn().mockResolvedValue(true),
    getTag: jest.fn().mockResolvedValue({ 
      id: 'test-tag',
      ndefMessage: [{
        tnf: 1,
        type: [0x55], // URI record
        payload: [0x04, ...Array.from(new TextEncoder().encode('zaptap.cloud/share/test123'))]
      }]
    }),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(true),
    setEventListener: jest.fn(),
    registerTagEvent: jest.fn().mockResolvedValue(true),
    unregisterTagEvent: jest.fn().mockResolvedValue(true),
    goToNfcSetting: jest.fn(),
    ndefHandler: {
      writeNdefMessage: jest.fn().mockResolvedValue(true),
    },
  },
  NfcTech: {
    Ndef: 'Ndef',
    IsoDep: 'IsoDep',
    MifareClassic: 'MifareClassic',
  },
  Ndef: {
    uriRecord: jest.fn().mockReturnValue({
      tnf: 1,
      type: [0x55],
      payload: [0x04, 116, 101, 115, 116],
    }),
    textRecord: jest.fn().mockReturnValue({
      tnf: 1,
      type: [0x54],
      payload: [0x02, 101, 110, 116, 101, 115, 116],
    }),
    encodeMessage: jest.fn().mockReturnValue([1, 2, 3, 4]),
  },
  NfcEvents: {
    DiscoverTag: 'DiscoverTag',
    SessionClosed: 'SessionClosed',
    StateChanged: 'StateChanged',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // Add additional mocks for functions we use
  Reanimated.useSharedValue = jest.fn(() => ({ value: 0 }));
  Reanimated.useAnimatedStyle = jest.fn(() => ({}));
  Reanimated.withSpring = jest.fn(value => value);
  Reanimated.withTiming = jest.fn(value => value);
  Reanimated.interpolate = jest.fn();
  Reanimated.Extrapolate = { CLAMP: 'clamp' };
  Reanimated.runOnJS = jest.fn(fn => fn);
  
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {},
    Gesture: {
      Pan: jest.fn().mockReturnValue({
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: View,
  };
});

// Mock react-native-draggable-flatlist
jest.mock('react-native-draggable-flatlist', () => {
  const MockedDraggableFlatList = require('react-native').FlatList;
  MockedDraggableFlatList.ScaleDecorator = ({ children }) => children;
  return {
    __esModule: true,
    default: MockedDraggableFlatList,
    ScaleDecorator: ({ children }) => children,
  };
});

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
  })),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
  useFocusEffect: jest.fn(),
}));

import { TestEnvironment, TestConfig } from './testConfig';

// Set up test environment
TestEnvironment.setup();

// Global test timeout
jest.setTimeout(TestConfig.getTimeout('renderTimeout'));

// Silence console warnings in tests if configured
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  if (TestConfig.shouldSilenceConsole()) {
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  TestEnvironment.teardown();
});

// Add global test utilities
(global as any).testConfig = TestConfig;