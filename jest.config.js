module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(react-native-reanimated|react-native-gesture-handler|expo-router|expo-router/react-navigation|react-native-safe-area-context|expo-status-bar)$': '<rootDir>/__mocks__/racePresentation.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': 'react-native-web',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    '^(expo-asset|expo-audio)$': '<rootDir>/__mocks__/supercarExpo.js',
    '\\.(png|jpg|jpeg|gif|webp|wav)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native-async-storage|react-native-web)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/tests/**/*.test.[jt]s?(x)'],
};
