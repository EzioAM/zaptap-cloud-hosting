module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Import optimizations
      [
        'babel-plugin-transform-imports',
        {
          'lodash': {
            'transform': 'lodash/${member}',
            'preventFullImport': true
          },
          'date-fns': {
            'transform': 'date-fns/${member}',
            'preventFullImport': true
          },
          'react-native-paper': {
            'transform': 'react-native-paper/lib/module/components/${member}',
            'preventFullImport': true,
            'skipDefaultConversion': true
          }
        }
      ],
      // Remove console logs in production
      process.env.NODE_ENV === 'production' && 'transform-remove-console',
      // Reanimated plugin must be last
      'react-native-reanimated/plugin'
    ].filter(Boolean),
    env: {
      production: {
        plugins: [
          'transform-remove-console',
          'babel-plugin-transform-remove-debugger'
        ]
      }
    }
  };
};