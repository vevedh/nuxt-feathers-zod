#!/usr/bin/env node
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const targets = [
  '.nuxt',
  '.nitro',
  '.output',
  'dist',
  'node_modules/.cache',
  'node_modules/.vite',
  'playground/.nuxt',
  'playground/.nitro',
  'playground/.output',
  'playground/node_modules/.cache',
  'playground/node_modules/.vite',
]

for (const target of targets) {
  const full = resolve(process.cwd(), target)
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true })
    console.log(`[nuxt-feathers-zod] Removed ${target}`)
  }
}

console.log('[nuxt-feathers-zod] Cleanup complete without requiring local @nuxt/kit')
