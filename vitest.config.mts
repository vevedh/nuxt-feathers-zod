import { defineConfig } from 'vitest/config'
import { sharedEsbuildConfig, sharedResolveConfig, sharedTestConfig } from './vitest.shared.mts'

export default defineConfig({
  esbuild: sharedEsbuildConfig,
  resolve: sharedResolveConfig,
  test: {
    ...sharedTestConfig,
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts', 'test/**/*.spec.ts'],
  },
})
