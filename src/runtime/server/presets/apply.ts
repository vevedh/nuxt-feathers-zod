import type { CoreContext, PresetPlan } from './types'
import { spawn } from 'node:child_process'

let running = false

function bunxBin() {
  return process.platform === 'win32' ? 'bunx.cmd' : 'bunx'
}

function pushCapped(acc: string, chunk: string, max: number) {
  const next = acc + chunk
  return next.length > max ? next.slice(next.length - max) : next
}

export async function applyPlan(plan: PresetPlan, ctx: CoreContext) {
  if (!ctx.allowWrite) {
    const err: any = new Error('Console write is disabled (feathers.console.allowWrite=false)')
    err.statusCode = 403
    throw err
  }
  if (running) {
    const err: any = new Error('Preset apply is already running (locked)')
    err.statusCode = 423
    throw err
  }

  running = true
  try {
    const rootDir = ctx.rootDir || process.cwd()

    const args = [...plan.command]
    // plan.command begins with bunx; spawn uses bunx bin + args without bunx
    const bin = bunxBin()
    const spawnArgs = args[0] === 'bunx' ? args.slice(1) : args

    const env = { ...process.env, ...plan.env }

    let stdout = ''
    let stderr = ''
    const child = spawn(bin, spawnArgs, { cwd: rootDir, env, shell: false })

    child.stdout?.on('data', (d) => { stdout = pushCapped(stdout, String(d), 160_000) })
    child.stderr?.on('data', (d) => { stderr = pushCapped(stderr, String(d), 160_000) })

    const code: number = await new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('close', resolve)
    })

    if (code !== 0) {
      const err: any = new Error(`Preset apply failed (exit ${code})`)
      err.statusCode = 500
      err.stdout = stdout
      err.stderr = stderr
      throw err
    }

    return { ok: true, stdout, stderr }
  }
  finally {
    running = false
  }
}
