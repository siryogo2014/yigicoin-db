
/**
 * Configuración de Jest para el proyecto YigiCoin
 */

module.exports = {
  // Preset para proyectos de Next.js con TypeScript
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Directorios de tests
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Transformaciones
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Módulos a ignorar
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Archivos de setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Cobertura
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  // Timeouts
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
