const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  globalSetup: '<rootDir>/jest.global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleDirectories: ['node_modules', '<rootDir>'],
};

// createJestConfig is exported this way to ensure next/jest can load the
// Next.js config, which is async
module.exports = createJestConfig(customJestConfig);
