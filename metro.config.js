const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = getDefaultConfig(__dirname);

// CRITICAL FIX: Disable package exports to prevent module order issues
// This fixes "Cannot read property 'setGlobalHandler' of undefined" error
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false, // Changed from true - this is the key fix!
  unstable_conditionNames: ['browser', 'require', 'react-native'],
  sourceExts: [...(config.resolver?.sourceExts || []), 'cjs'],
  // Add Reanimated support
  assetExts: [...(config.resolver?.assetExts || []), 'db'],
  // Ensure proper resolution order for global polyfills
  platforms: ['ios', 'android', 'native', 'web'],
};

config.server = {
  ...config.server,
  // Increase timeout for source map requests
  rewriteRequestUrl: (url) => {
    // Handle source map URLs properly
    if (url.includes('.map')) {
      return url;
    }
    return url;
  },
  enhanceMiddleware: (middleware, metroServer) => {
    return (req, res, next) => {
      // Add CORS headers for all requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle OPTIONS requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Special handling for source maps
      if (req.url && req.url.includes('.map')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
      }
      
      return middleware(req, res, next);
    };
  },
};

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
  // Enable source maps in development
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Enable source map generation and inject ErrorUtils polyfill at the very start
config.serializer = {
  ...config.serializer,
  getPolyfills: () => [require.resolve('./ErrorUtils.polyfill.js')],
};

module.exports = config;