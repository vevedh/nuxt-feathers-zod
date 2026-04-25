/*
 * nuxt-feathers-zod postinstall
 *
 * Goal: make the "Step 1 - Initialisation" experience less error-prone.
 *
 * This script is intentionally conservative:
 * - It only targets the project where the install was launched (INIT_CWD).
 * - It only patches nuxt.config.* if the module isn't already configured.
 * - It won't overwrite an existing "feathers" block.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = process.env.INIT_CWD || process.cwd()

const CANDIDATES = [
  'nuxt.config.ts',
  'nuxt.config.mts',
  'nuxt.config.js',
  'nuxt.config.mjs',
]

function isModuleRepo(root) {
  try {
    const pkgPath = join(root, 'package.json')
    if (!existsSync(pkgPath))
      return false
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return pkg?.name === 'nuxt-feathers-zod'
  }
  catch {
    return false
  }
}

function hasLocalModuleRef(src) {
  // When building the module itself, Nuxt config must reference the local entry:
  //  - root:  modules: ['./src/module.ts']
  //  - playground: modules: ['../src/module.ts']
  return /['"]\.{1,2}\/src\/module(\.ts)?['"]/.test(src)
}

function pickConfigFile(root) {
  for (const f of CANDIDATES) {
    const p = join(root, f)
    if (existsSync(p))
      return p
  }
  return null
}

function patchModulesArray(src) {
  // modules: [ ... ]
  // Insert 'nuxt-feathers-zod' as the first entry if missing.
  return src.replace(
    /(\bmodules\s*:\s*\[)([^\]]*)(\])/,
    (full, start, inner, end) => {
      if (/['"]nuxt-feathers-zod['"]/.test(full))
        return full

      // Keep formatting roughly stable.
      const trimmed = inner.trim()
      if (!trimmed)
        return `${start}\n    'nuxt-feathers-zod',\n  ${end}`

      // Preserve existing spacing/newlines as much as possible.
      const prefix = /^\s*\n/.test(inner) ? '' : ' '
      return `${start}${prefix}'nuxt-feathers-zod',${inner}${end}`
    },
  )
}

function injectDefaultsAfterDefine(src) {
  // Very conservative insert right after "defineNuxtConfig({".
  const anchor = /defineNuxtConfig\(\{\s*/
  if (!anchor.test(src))
    return src

  const insert = [
    '  // Added by nuxt-feathers-zod postinstall (safe defaults)',
    '  modules: [\'nuxt-feathers-zod\'],',
    '  feathers: {',
    '    // IMPORTANT: keep this aligned with the official module docs.',
    '    servicesDirs: [\'services\'],',
    '  },',
    '',
  ].join('\n')

  return src.replace(anchor, m => `${m}${insert}\n`)
}

function injectFeathersDefaultsNearTop(src) {
  // If modules exist but feathers doesn't, try to add feathers block right after modules.
  if (/\bfeathers\s*:/.test(src))
    return src

  const re = /(\bmodules\s*:\s*\[[^\]]*\]\s*(?:,\s*)?\n)/
  if (!re.test(src))
    return src

  const insert = [
    '  feathers: {',
    '    servicesDirs: [\'services\'],',
    '  },',
    '',
  ].join('\n')

  return src.replace(re, m => `${m}${insert}\n`)
}

function patchNuxtConfig(raw) {
  // Already configured -> do nothing.
  // - either by module name (consumer app)
  // - or by local module entry (module repo / playground)
  if (/['"]nuxt-feathers-zod['"]/.test(raw) || hasLocalModuleRef(raw))
    return { changed: false, content: raw }

  let next = raw

  // 1) Try to patch existing modules array.
  if (/\bmodules\s*:\s*\[/.test(next)) {
    next = patchModulesArray(next)
    next = injectFeathersDefaultsNearTop(next)
    return { changed: next !== raw, content: next }
  }

  // 2) No modules block: inject a small defaults block after defineNuxtConfig({
  next = injectDefaultsAfterDefine(next)
  return { changed: next !== raw, content: next }
}

function main() {
  // Never patch the module repository itself.
  // When building nuxt-feathers-zod, Nuxt configs must reference the local entry (./src/module.ts).
  if (isModuleRepo(PROJECT_ROOT))
    return

  const configPath = pickConfigFile(PROJECT_ROOT)
  if (!configPath)
    return

  let raw
  try {
    raw = readFileSync(configPath, 'utf8')
  }
  catch {
    return
  }

  const { changed, content } = patchNuxtConfig(raw)
  if (!changed)
    return

  try {
    writeFileSync(configPath, content, 'utf8')
  }
  catch {
    // Silent failure: postinstall should never block install.
  }
}

main()
