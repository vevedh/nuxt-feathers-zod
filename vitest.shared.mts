import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))

export const sharedTestConfig = {
  environment: 'node',
  globals: true,
  exclude: ['dist/**', 'node_modules/**'],
  restoreMocks: true,
  retry: process.env.CI ? 1 : 0,
  fileParallelism: false,
  maxWorkers: 1,
  minWorkers: 1,
  testTimeout: 30_000,
  hookTimeout: 30_000,
}

export const sharedResolveConfig = {
  alias: [
    {
      find: /^nuxt-feathers-zod$/,
      replacement: resolve(rootDir, 'src/module.ts'),
    },
  ],
}


export const sharedEsbuildConfig = {
  tsconfigRaw: {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
    },
  },
}
