import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, forbidden, label) {
  if (source.includes(forbidden))
    problems.push(`${label}: forbidden ${JSON.stringify(forbidden)}`)
}

const authHookTest = read('src/runtime/auth/hook.test.ts')

requireText(
  authHookTest,
  "const createHookContext = (type: 'before' | 'around'): HookContext => ({",
  'authentication hook immutable context factory',
)
requireText(
  authHookTest,
  'Promise.resolve(asBeforeHook.call(beforeContext.service, beforeContext))',
  'authentication before-hook this binding',
)
requireText(
  authHookTest,
  'asAroundHook(aroundContext, next)',
  'authentication around-hook invocation',
)
forbidText(
  authHookTest,
  'typedHook(context)',
  'authentication hybrid hook invocation without service this binding',
)
forbidText(
  authHookTest,
  "context.type = 'around'",
  'authentication hook readonly context mutation',
)

if (problems.length) {
  console.error('[nuxt-feathers-zod] Release TypeScript regression guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Release TypeScript regressions are covered.')
