import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const config = readFileSync(resolve(rootDir, 'playground/nuxt.config.ts'), 'utf8')
const dashboard = readFileSync(resolve(rootDir, 'playground/app/pages/index.vue'), 'utf8')

const problems = []

if (!/\bssr:\s*true\b/.test(config))
  problems.push('playground SSR must remain enabled')

if (/routeRules:\s*\{[\s\S]*?['"]\/['"]:\s*\{\s*ssr:\s*false\s*\}/.test(config))
  problems.push('the playground root route must not disable SSR')

if (dashboard.includes('definePageMeta({ ssr: false })'))
  problems.push('page metadata must not pretend to disable SSR')

const requiredDashboardFragments = [
  'const sessionUiReady = ref(false)',
  'const displayAuthenticated = computed(() => sessionUiReady.value && isAuthenticated.value)',
  'v-if="!sessionUiReady"',
  'Initialisation de la session…',
]

for (const fragment of requiredDashboardFragments) {
  if (!dashboard.includes(fragment))
    problems.push(`missing auth hydration invariant: ${fragment}`)
}

const mountedMatch = dashboard.match(/onMounted\(async \(\) => \{([\s\S]*?)\n\}\)\n<\/script>/)
if (!mountedMatch) {
  problems.push('the dashboard auth bootstrap onMounted block is missing')
}
else {
  const mountedBlock = mountedMatch[1]
  const initIndex = mountedBlock.indexOf('await auth.init()')
  const catchIndex = mountedBlock.indexOf('catch (error)')
  const errorIndex = mountedBlock.indexOf('authError.value = errorMessage(error)')
  const finallyIndex = mountedBlock.indexOf('finally')
  const readyIndex = mountedBlock.indexOf('sessionUiReady.value = true')

  if (
    initIndex < 0
    || catchIndex < initIndex
    || errorIndex < catchIndex
    || finallyIndex < errorIndex
    || readyIndex < finallyIndex
  ) {
    problems.push('onMounted auth bootstrap must initialize, surface its own error, then release the UI latch in finally')
  }
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Playground auth hydration guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Playground SSR/auth hydration boundary is deterministic.')
