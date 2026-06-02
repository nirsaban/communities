/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/jest.env.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/jobs/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      // Globals are tuned conservatively because the pre-P4 community/event/storage
      // services have unexercised error paths. Per-touched-file coverage (kickoff
      // rule) is enforced via review — see docs/DECISIONS.md.
      branches: 40,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
  verbose: false,
};
