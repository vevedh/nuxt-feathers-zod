import { defineConfig } from 'vitest/config'
import { sharedEsbuildConfig, sharedResolveConfig, sharedTestConfig } from './vitest.shared.mts'

export default defineConfig({
  esbuild: sharedEsbuildConfig,
  resolve: sharedResolveConfig,
  test: {
    ...sharedTestConfig,
    include: ['test/e2e/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
