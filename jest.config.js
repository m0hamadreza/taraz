/**
 * Only the pure modules are unit-tested: valuation, ranking, formatting and the
 * price engine. That is where the correctness risk actually lives — a component
 * test would mostly assert that React renders.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
