import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.spec.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 120000,
    restoreMocks: true,
  },
})
