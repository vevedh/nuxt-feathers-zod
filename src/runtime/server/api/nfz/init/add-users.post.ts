import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { spawn } from 'node:child_process'

let running = false

export default defineEventHandler(async (event) => {
  const nuxt = event.context?.nuxt
  const rootDir = nuxt?.options?.rootDir || process.cwd()
  const feathers = nuxt?.options?.feathers || {}

  const allowWrite = !!feathers.console?.allowWrite
  if (!allowWrite) {
    setResponseStatus(event, 403)
    return { ok: false, message: 'Console write is disabled (feathers.console.allowWrite=false)' }
  }

  if (running) {
    setResponseStatus(event, 423)
    return { ok: false, message: 'Init step is already running (locked)' }
  }

  const body = await readBody(event) as any
  // The add service CLI currently uses the local auth defaults userId/password.
  // usernameField/passwordField are kept in the request body contract for future extension.

  running = true
  try {
    // Use bunx to generate the users service with local auth hooks.
    // We cap stdout/stderr to avoid OOM.
    const args = [
      'nuxt-feathers-zod',
      'add',
      'service',
      'users',
      '--auth',
      '--adapter',
      String(body?.adapter || 'mongodb'),
    ]

    const child = spawn(process.platform === 'win32' ? 'bunx.cmd' : 'bunx', args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

    const cap = 64 * 1024
    let out = ''
    let err = ''
    child.stdout?.on('data', (d) => { if (out.length < cap) out += String(d) })
    child.stderr?.on('data', (d) => { if (err.length < cap) err += String(d) })

    const code: number = await new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('close', (c) => resolve(c ?? 0))
    })

    if (code !== 0) {
      setResponseStatus(event, 500)
      return { ok: false, message: `bunx exited with code ${code}`, stdout: out, stderr: err }
    }

    return {
      ok: true,
      message: 'users service generated. Restart the dev server to take effect.',
      stdout: out,
      stderr: err,
    }
  } catch (e: any) {
    setResponseStatus(event, 500)
    return { ok: false, message: e?.message || String(e) }
  } finally {
    running = false
  }
})
