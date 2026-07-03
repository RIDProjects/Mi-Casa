const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Transpile packages that use private class fields (#field syntax)
// react@19, @tanstack/react-query@5, reanimated@4 all use them
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(' +
    'react-native' +
    '|@react-native(-community)?' +
    '|expo(nent)?' +
    '|@expo(nent)?(/.*)?'  +
    '|react-navigation' +
    '|@react-navigation(/.*)?'  +
    '|@tanstack(/.*)?'  +
    '|react-native-reanimated' +
    '|react-native-gesture-handler' +
    '|react-native-screens' +
    '|react-native-safe-area-context' +
    '|@react-native-async-storage(/.*)?'  +
    ')/)',
];

module.exports = config;
