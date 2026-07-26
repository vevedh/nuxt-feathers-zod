import { spawnSync } from 'node:child_process'

export const DEFAULT_WINDOWS_INSTALL_PROBES = Object.freeze([
  'eslint',
  '@nuxt/kit',
  'typescript',
])

function normalizeFailure(error) {
  if (!(error instanceof Error))
    return { name: 'Error', message: String(error), code: undefined }

  return {
    name: error.name,
    message: error.message,
    code: typeof error.code === 'string' ? error.code : undefined,
  }
}

export function createVerificationProgram(probes = DEFAULT_WINDOWS_INSTALL_PROBES) {
  return `
const probes = ${JSON.stringify([...probes])}
const failures = []
for (const specifier of probes) {
  try {
    await import(specifier)
  }
  catch (error) {
    failures.push({
      specifier,
      name: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && typeof error.code === 'string' ? error.code : undefined,
    })
  }
}
if (failures.length > 0) {
  console.error(JSON.stringify({ failures }))
  process.exit(1)
}
console.log(JSON.stringify({ verified: probes }))
`
}

export function verifyWindowsInstall({
  root,
  nodeExecutable = process.execPath,
  probes = DEFAULT_WINDOWS_INSTALL_PROBES,
  spawnSyncImpl = spawnSync,
} = {}) {
  if (!root)
    throw new TypeError('verifyWindowsInstall requires a project root')

  const result = spawnSyncImpl(nodeExecutable, [
    '--input-type=module',
    '--eval',
    createVerificationProgram(probes),
  ], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 8 * 1024 * 1024,
  })

  const stdout = String(result.stdout || '').trim()
  const stderr = String(result.stderr || '').trim()
  const error = result.error ? normalizeFailure(result.error) : undefined

  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    error,
    probes: [...probes],
  }
}

export function formatWindowsInstallVerificationFailure(result) {
  const details = []
  if (result.error)
    details.push(`${result.error.name}: ${result.error.message}`)
  if (result.stderr)
    details.push(result.stderr)
  if (result.stdout)
    details.push(result.stdout)
  if (details.length === 0)
    details.push(`verification process exited with status ${result.status ?? 'unknown'}`)
  return details.join('\n')
}
