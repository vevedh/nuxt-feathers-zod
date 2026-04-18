#!/usr/bin/env node
import { rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const targets = ['.nuxt', '.nitro', 'dist', 'playground/.nuxt', 'playground/.nitro']
for (const target of targets) {
  const full = resolve(process.cwd(), target)
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true })
    console.log(`[nuxt-feathers-zod] Removed ${target}`)
  }
}
console.log('[nuxt-feathers-zod] Cleanup complete without requiring local @nuxt/kit')
