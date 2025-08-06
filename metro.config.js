const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable asset optimization
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    ecma: 8,
    keep_fnames: false,
    keep_classnames: false,
    module: true,
    mangle: {
      module: true,
      keep_fnames: false,
    },
    compress: {
      module: true,
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      passes: 2,
    },
  },
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Optimize resolver for faster builds
config.resolver = {
  ...config.resolver,
  // Cache module resolution
  hasteImplModulePath: null,
  // Improve module resolution performance
  resolverMainFields: ['react-native', 'browser', 'main'],
};

// Enable RAM bundles for better startup performance
if (process.env.NODE_ENV === 'production') {
  config.serializer = {
    ...config.serializer,
    createModuleIdFactory: require('metro/src/lib/createModuleIdFactory'),
    processModuleFilter: (module) => {
      // Filter out development-only modules
      if (module.path.indexOf('__tests__') >= 0) {
        return false;
      }
      if (module.path.indexOf('.test.') >= 0) {
        return false;
      }
      if (module.path.indexOf('.spec.') >= 0) {
        return false;
      }
      return true;
    },
  };
}

// Optimize caching
const { FileStore } = require('metro-cache');
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, '.metro-cache'),
  }),
];

module.exports = config;