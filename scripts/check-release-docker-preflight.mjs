import { spawnSync } from 'node:child_process'

const timeoutMs = Number(process.env.NFZ_RELEASE_DOCKER_PREFLIGHT_TIMEOUT_MS || 15000)
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000)
  throw new Error('NFZ_RELEASE_DOCKER_PREFLIGHT_TIMEOUT_MS must be a number >= 1000.')

const attempts = Number(process.env.NFZ_RELEASE_DOCKER_PREFLIGHT_ATTEMPTS || 3)
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10)
  throw new Error('NFZ_RELEASE_DOCKER_PREFLIGHT_ATTEMPTS must be an integer between 1 and 10.')

let lastFailure = ''
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
  })
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim()
  if (result.status === 0 && output) {
    console.log(`[release] Docker engine preflight passed: server=${output}`)
    process.exit(0)
  }

  if (result.error?.code === 'ENOENT')
    lastFailure = 'Docker CLI is not installed or is not available on PATH.'
  else if (result.error?.code === 'ETIMEDOUT')
    lastFailure = `Docker engine probe exceeded ${timeoutMs} ms.`
  else
    lastFailure = output || result.error?.message || `docker version exited with ${result.status}`

  if (attempt < attempts) {
    const waitUntil = Date.now() + 1000
    while (Date.now() < waitUntil) {}
  }
}

throw new Error(
  `[release] Docker Desktop/Engine is required before the full exact-artifact certification starts. ${lastFailure} `
  + 'Start Docker, verify `docker version`, then rerun the gate. '
  + 'Use NFZ_RELEASE_DOCKER_PREFLIGHT_TIMEOUT_MS/NFZ_RELEASE_DOCKER_PREFLIGHT_ATTEMPTS only to tune a slow host.',
)
