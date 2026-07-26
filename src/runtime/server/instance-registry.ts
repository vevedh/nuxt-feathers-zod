export type NfzRuntimeStatus = 'initializing' | 'ready' | 'failed' | 'closing' | 'closed'

export interface NfzRuntimeInstance<Application = any> {
  id: string
  status: NfzRuntimeStatus
  app?: Application
  error?: Error
  /** Safe correlation identifier. It never contains the original error message. */
  failureId?: string
  ready: Promise<Application>
  close(): Promise<void>
}

export interface NfzRuntimeInstanceClaim<Application = any> {
  instance: NfzRuntimeInstance<Application>
  created: boolean
}

interface MutableNfzRuntimeInstance<Application = any> extends NfzRuntimeInstance<Application> {
  resolveReady(app: Application): void
  rejectReady(error: Error): void
  closeHandler?(): Promise<void>
  closePromise?: Promise<void>
  readySettled: boolean
}

const REGISTRY_PROPERTY = '__NFZ_RUNTIME_INSTANCES__'
const FAILURE_COUNTER_PROPERTY = '__NFZ_RUNTIME_FAILURE_COUNTER__'
const DEFAULT_INSTANCE_ID = 'default'
const DEFAULT_READY_TIMEOUT_MS = 15_000

function getRegistry(): Map<string, MutableNfzRuntimeInstance> {
  const root = globalThis as typeof globalThis & {
    [REGISTRY_PROPERTY]?: Map<string, MutableNfzRuntimeInstance>
  }

  if (!root[REGISTRY_PROPERTY])
    root[REGISTRY_PROPERTY] = new Map<string, MutableNfzRuntimeInstance>()

  return root[REGISTRY_PROPERTY]
}

function nextFailureId(instanceId: string): string {
  const root = globalThis as typeof globalThis & {
    [FAILURE_COUNTER_PROPERTY]?: number
  }
  root[FAILURE_COUNTER_PROPERTY] = (root[FAILURE_COUNTER_PROPERTY] ?? 0) + 1
  const safeId = instanceId.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'runtime'
  return `nfz-${safeId}-${Date.now().toString(36)}-${root[FAILURE_COUNTER_PROPERTY].toString(36)}`
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error || 'Unknown runtime error'))
}

function createRuntimeInstance<Application>(id: string): MutableNfzRuntimeInstance<Application> {
  let resolveReady!: (app: Application) => void
  let rejectReady!: (error: Error) => void

  const ready = new Promise<Application>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  // The REST bridge normally consumes this promise. Keeping a passive rejection
  // handler avoids process-level unhandled rejections when startup fails before
  // the first request reaches the bridge.
  void ready.catch(() => undefined)

  const instance: MutableNfzRuntimeInstance<Application> = {
    id,
    status: 'initializing',
    ready,
    readySettled: false,
    resolveReady,
    rejectReady,
    async close() {
      if (instance.closePromise)
        return instance.closePromise

      instance.closePromise = (async () => {
        if (instance.status === 'closed')
          return

        const preserveFailedState = instance.status === 'failed'
        if (!preserveFailedState)
          instance.status = 'closing'

        try {
          await instance.closeHandler?.()
        }
        finally {
          instance.status = preserveFailedState ? 'failed' : 'closed'
        }
      })()

      return instance.closePromise
    },
  }

  return instance
}

/**
 * Atomically claims a runtime instance id.
 *
 * The first caller receives a new `initializing` instance. Concurrent callers
 * receive the exact same instance and must await its `ready` promise instead of
 * executing bootstrap phases again.
 */
export function claimNfzRuntimeInstance<Application = any>(id = DEFAULT_INSTANCE_ID): NfzRuntimeInstanceClaim<Application> {
  const registry = getRegistry()
  const existing = registry.get(id) as MutableNfzRuntimeInstance<Application> | undefined

  if (existing && existing.status !== 'closed')
    return { instance: existing, created: false }

  const instance = createRuntimeInstance<Application>(id)
  registry.set(id, instance as MutableNfzRuntimeInstance)
  return { instance, created: true }
}

/**
 * Backward-compatible strict claim. Prefer `claimNfzRuntimeInstance()` in
 * idempotent runtime bootstraps.
 */
export function beginNfzRuntimeInstance<Application = any>(id = DEFAULT_INSTANCE_ID): NfzRuntimeInstance<Application> {
  const claim = claimNfzRuntimeInstance<Application>(id)
  if (!claim.created)
    throw new Error(`[nuxt-feathers-zod] Runtime instance "${id}" is already ${claim.instance.status}.`)
  return claim.instance
}

export function getNfzRuntimeInstance<Application = any>(id = DEFAULT_INSTANCE_ID): NfzRuntimeInstance<Application> | undefined {
  return getRegistry().get(id) as NfzRuntimeInstance<Application> | undefined
}

export function setNfzRuntimeApp<Application>(instance: NfzRuntimeInstance<Application>, app: Application): void {
  const mutable = instance as MutableNfzRuntimeInstance<Application>
  mutable.app = app
}

export function markNfzRuntimeReady<Application>(instance: NfzRuntimeInstance<Application>, app: Application): void {
  const mutable = instance as MutableNfzRuntimeInstance<Application>
  mutable.app = app
  mutable.status = 'ready'
  if (!mutable.readySettled) {
    mutable.readySettled = true
    mutable.resolveReady(app)
  }
}

export function markNfzRuntimeFailed(instance: NfzRuntimeInstance, error: unknown): Error {
  const mutable = instance as MutableNfzRuntimeInstance
  if (mutable.status === 'failed' && mutable.error)
    return mutable.error

  const failure = toError(error)
  mutable.error = failure
  mutable.failureId = mutable.failureId || nextFailureId(instance.id)
  mutable.status = 'failed'
  if (!mutable.readySettled) {
    mutable.readySettled = true
    mutable.rejectReady(failure)
  }
  return failure
}

export function setNfzRuntimeCloseHandler(
  instance: NfzRuntimeInstance,
  handler: () => Promise<void>,
): void {
  const mutable = instance as MutableNfzRuntimeInstance
  mutable.closeHandler = handler
}

export async function waitForNfzRuntimeInstance<Application = any>(
  id = DEFAULT_INSTANCE_ID,
  timeoutMs = DEFAULT_READY_TIMEOUT_MS,
): Promise<NfzRuntimeInstance<Application>> {
  const instance = getNfzRuntimeInstance<Application>(id)
  if (!instance)
    throw new Error(`[nuxt-feathers-zod] Runtime instance "${id}" has not started.`)

  if (instance.status === 'ready')
    return instance

  if (instance.status === 'failed')
    throw instance.error || new Error(`[nuxt-feathers-zod] Runtime instance "${id}" failed to start.`)

  if (instance.status === 'closing' || instance.status === 'closed')
    throw new Error(`[nuxt-feathers-zod] Runtime instance "${id}" is ${instance.status}.`)

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      instance.ready,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`[nuxt-feathers-zod] Runtime instance "${id}" was not ready after ${timeoutMs} ms.`))
        }, timeoutMs)
        const timerWithUnref = timer as ReturnType<typeof setTimeout> & { unref?(): void }
        timerWithUnref.unref?.()
      }),
    ])
    return instance
  }
  finally {
    if (timer)
      clearTimeout(timer)
  }
}

export function clearNfzRuntimeInstance(id = DEFAULT_INSTANCE_ID): void {
  getRegistry().delete(id)
}
