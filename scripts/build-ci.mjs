import { spawn } from 'node:child_process'

const isWin = process.platform === 'win32'
const command = isWin ? 'bunx nuxi build playground' : 'bunx'
const args = isWin ? [] : ['nuxi', 'build', 'playground']

const child = spawn(command, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: isWin,
  windowsHide: true,
  env: process.env,
})

let stdoutBuffer = ''
let stderrBuffer = ''
let successDetected = false
let finalized = false
let forcedExitTimer = null

function finalize(code) {
  if (finalized) return
  finalized = true
  if (forcedExitTimer) clearTimeout(forcedExitTimer)

  if (child.exitCode === null && !child.killed) {
    try {
      child.kill('SIGTERM')
    }
    catch {}
  }

  process.exit(code)
}

function onChunk(stream, chunk) {
  const text = chunk.toString()
  stream.write(text)
  return text
}

function checkSuccess(text) {
  if (successDetected) return
  if (text.includes('✨ Build complete!') || text.includes('You can preview this build using')) {
    successDetected = true
    forcedExitTimer = setTimeout(() => {
      console.warn('\n[NFZ build:ci] Build success detected but process is still alive. Forcing a clean exit to avoid Bun/Nuxt shell hang.')
      finalize(0)
    }, 1500)
  }
}

child.stdout?.on('data', (chunk) => {
  const text = onChunk(process.stdout, chunk)
  stdoutBuffer += text
  checkSuccess(text)
})

child.stderr?.on('data', (chunk) => {
  const text = onChunk(process.stderr, chunk)
  stderrBuffer += text
  checkSuccess(text)
})

child.on('error', (error) => {
  console.error('[NFZ build:ci] Failed to start build process:', error)
  finalize(1)
})

child.on('close', (code, signal) => {
  if (finalized) return

  if (signal && !successDetected) {
    console.error(`[NFZ build:ci] Build process terminated by signal ${signal}.`)
    return finalize(1)
  }

  if (typeof code === 'number') {
    if (code === 0) return finalize(0)
    console.error(`[NFZ build:ci] Build exited with code ${code}.`)
    return finalize(code)
  }

  if (successDetected) return finalize(0)

  console.error('[NFZ build:ci] Build exited without a numeric code and success marker was not detected.')
  if (stderrBuffer.trim()) console.error(stderrBuffer.trim())
  finalize(1)
})
