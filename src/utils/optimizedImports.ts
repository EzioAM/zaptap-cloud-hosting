/**
 * Optimized imports for common libraries
 * This file provides tree-shakeable imports for heavy libraries
 */

// Optimized lodash imports
export { default as debounce } from 'lodash/debounce';
export { default as throttle } from 'lodash/throttle';
export { default as isEmpty } from 'lodash/isEmpty';
export { default as isEqual } from 'lodash/isEqual';
export { default as pick } from 'lodash/pick';
export { default as omit } from 'lodash/omit';
export { default as get } from 'lodash/get';
export { default as set } from 'lodash/set';
export { default as cloneDeep } from 'lodash/cloneDeep';
export { default as merge } from 'lodash/merge';

// Optimized date-fns imports
export { format as formatDate } from 'date-fns/format';
export { parseISO } from 'date-fns/parseISO';
export { addDays } from 'date-fns/addDays';
export { subDays } from 'date-fns/subDays';
export { differenceInDays } from 'date-fns/differenceInDays';
export { isAfter } from 'date-fns/isAfter';
export { isBefore } from 'date-fns/isBefore';
export { startOfDay } from 'date-fns/startOfDay';
export { endOfDay } from 'date-fns/endOfDay';

// Icon imports optimization helper
export const getIcon = async (iconName: string, library: 'material' | 'ionicons' | 'feather' = 'material') => {
  switch (library) {
    case 'material':
      const { default: MaterialIcon } = await import('react-native-vector-icons/MaterialIcons');
      return MaterialIcon;
    case 'ionicons':
      const { default: Ionicon } = await import('react-native-vector-icons/Ionicons');
      return Ionicon;
    case 'feather':
      const { default: FeatherIcon } = await import('react-native-vector-icons/Feather');
      return FeatherIcon;
    default:
      const { default: DefaultIcon } = await import('react-native-vector-icons/MaterialIcons');
      return DefaultIcon;
  }
};

// Lazy load heavy chart libraries
export const loadChartKit = () => import('react-native-chart-kit');
export const loadVictoryNative = () => import('victory-native');

// Lazy load animation libraries
export const loadLottie = () => import('lottie-react-native');
export const loadReanimated = () => import('react-native-reanimated');

// Cache for dynamically imported modules
const moduleCache = new Map<string, any>();

/**
 * Dynamic module loader with caching
 */
export async function loadModule<T>(
  moduleName: string,
  importFn: () => Promise<T>
): Promise<T> {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }
  
  try {
    const module = await importFn();
    moduleCache.set(moduleName, module);
    return module;
  } catch (error) {
    console.error(`Failed to load module ${moduleName}:`, error);
    throw error;
  }
}

/**
 * Clear module cache to free memory
 */
export function clearModuleCache(moduleName?: string) {
  if (moduleName) {
    moduleCache.delete(moduleName);
  } else {
    moduleCache.clear();
  }
}

// Optimized React Native Paper imports
export const PaperComponents = {
  Button: () => import('react-native-paper').then(m => m.Button),
  Card: () => import('react-native-paper').then(m => m.Card),
  TextInput: () => import('react-native-paper').then(m => m.TextInput),
  Checkbox: () => import('react-native-paper').then(m => m.Checkbox),
  RadioButton: () => import('react-native-paper').then(m => m.RadioButton),
  Switch: () => import('react-native-paper').then(m => m.Switch),
  FAB: () => import('react-native-paper').then(m => m.FAB),
  Portal: () => import('react-native-paper').then(m => m.Portal),
  Dialog: () => import('react-native-paper').then(m => m.Dialog),
  Snackbar: () => import('react-native-paper').then(m => m.Snackbar),
  Surface: () => import('react-native-paper').then(m => m.Surface),
  Divider: () => import('react-native-paper').then(m => m.Divider),
  Avatar: () => import('react-native-paper').then(m => m.Avatar),
  Badge: () => import('react-native-paper').then(m => m.Badge),
  Chip: () => import('react-native-paper').then(m => m.Chip),
  ProgressBar: () => import('react-native-paper').then(m => m.ProgressBar),
  ActivityIndicator: () => import('react-native-paper').then(m => m.ActivityIndicator),
};

// Optimized Expo module imports
export const ExpoModules = {
  Camera: () => import('expo-camera'),
  Location: () => import('expo-location'),
  ImagePicker: () => import('expo-image-picker'),
  Notifications: () => import('expo-notifications'),
  Haptics: () => import('expo-haptics'),
  Sharing: () => import('expo-sharing'),
  SMS: () => import('expo-sms'),
  Clipboard: () => import('expo-clipboard'),
  DocumentPicker: () => import('expo-document-picker'),
  MediaLibrary: () => import('expo-media-library'),
  Audio: () => import('expo-av').then(m => m.Audio),
  Video: () => import('expo-av').then(m => m.Video),
};

// Batch import helper for related components
export async function batchImport<T extends Record<string, () => Promise<any>>>(
  imports: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = Object.entries(imports);
  const results = await Promise.all(
    entries.map(async ([key, importFn]) => {
      try {
        const module = await importFn();
        return [key, module];
      } catch (error) {
        console.error(`Failed to import ${key}:`, error);
        return [key, null];
      }
    })
  );
  
  return Object.fromEntries(results) as any;
}

// Performance monitoring for imports
export function measureImportTime(moduleName: string) {
  return async <T>(importFn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const module = await importFn();
      const end = performance.now();
      console.log(`Import ${moduleName} took ${(end - start).toFixed(2)}ms`);
      return module;
    } catch (error) {
      console.error(`Failed to import ${moduleName}:`, error);
      throw error;
    }
  };
}