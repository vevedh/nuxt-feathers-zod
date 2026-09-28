#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadReleaseContract } from './lib/release-contract.mjs'

const root = resolve(process.cwd())
const contract = loadReleaseContract(root)
const problems = []

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    if (['node_modules', 'dist', '.nuxt', '.output', '.release-work', 'release-artifacts'].includes(entry))
      continue
    const absolute = resolve(directory, entry)
    const stat = statSync(absolute)
    if (stat.isDirectory())
      files.push(...walk(absolute))
    else
      files.push(absolute)
  }
  return files
}

for (const absolute of walk(resolve(root, 'scripts'))) {
  if (!/\.(?:mjs|js|ts|ps1)$/.test(absolute))
    continue
  const relative = absolute.slice(root.length + 1).replaceAll('\\', '/')
  if (relative === 'scripts/check-release-contract.mjs')
    continue
  const source = readFileSync(absolute, 'utf8')
  if (/package version must be \d+\.\d+\.\d+/i.test(source))
    problems.push(`${relative} hard-codes a package version as an active validation contract`)
  if (/canonicalize the Patch\d+ lockfiles/i.test(source))
    problems.push(`${relative} hard-codes a historical patch name in an active lockfile contract`)
}

if (contract.nativeCache.providers.join(',') !== 'memory,redis' || contract.nativeCache.distributed !== true)
  problems.push('release contract must describe the certified native memory + Redis/Valkey cache providers')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Release contract guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Release contract is dynamic and version-safe: ${contract.name}@${contract.version} tag=${contract.tag}.`)
