const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig: getExpoConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

// Get both React Native and Expo default configs
const defaultConfig = getDefaultConfig(__dirname);
const expoConfig = getExpoConfig(__dirname);

// Merge configs with React Native base first (to satisfy the warning)
const config = mergeConfig(defaultConfig, {
  ...expoConfig,
  resolver: {
    ...expoConfig.resolver,
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['browser', 'require', 'react-native'],
  },
});

module.exports = config;