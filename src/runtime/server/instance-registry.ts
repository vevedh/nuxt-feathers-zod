export type NfzRuntimeStatus = 'initializing' | 'ready' | 'failed' | 'closing' | 'closed'

export interface NfzRuntimeInstance<Application = any> {
  id: string
  status: NfzRuntimeStatus
  app?: Application
  error?: Error
  ready: Promise<Application>
  close(): Promise<void>
}

interface MutableNfzRuntimeInstance<Application = any> extends NfzRuntimeInstance<Application> {
  resolveReady(app: Application): void
  rejectReady(error: Error): void
  closeHandler?(): Promise<void>
  closePromise?: Promise<void>
}

const REGISTRY_PROPERTY = '__NFZ_RUNTIME_INSTANCES__'
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

  // The bridge normally consumes this promise. Keeping a passive rejection
  // handler avoids process-level unhandled rejections when startup fails before
  // any request reaches the bridge.
  void ready.catch(() => undefined)

  const instance: MutableNfzRuntimeInstance<Application> = {
    id,
    status: 'initializing',
    ready,
    resolveReady,
    rejectReady,
    async close() {
      if (instance.closePromise)
        return instance.closePromise

      instance.closePromise = (async () => {
        if (instance.status === 'closed')
          return

        instance.status = 'closing'
        try {
          await instance.closeHandler?.()
        }
        finally {
          instance.status = 'closed'
        }
      })()

      return instance.closePromise
    },
  }

  return instance
}

export function beginNfzRuntimeInstance<Application = any>(id = DEFAULT_INSTANCE_ID): NfzRuntimeInstance<Application> {
  const registry = getRegistry()
  const previous = registry.get(id)

  if (previous && previous.status !== 'closed' && previous.status !== 'failed')
    throw new Error(`[nuxt-feathers-zod] Runtime instance "${id}" is already ${previous.status}.`)

  const instance = createRuntimeInstance<Application>(id)
  registry.set(id, instance)
  return instance
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
  mutable.resolveReady(app)
}

export function markNfzRuntimeFailed(instance: NfzRuntimeInstance, error: unknown): Error {
  const mutable = instance as MutableNfzRuntimeInstance
  const failure = toError(error)
  mutable.error = failure
  mutable.status = 'failed'
  mutable.rejectReady(failure)
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
        timer.unref?.()
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
