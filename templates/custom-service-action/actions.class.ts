import type { Params } from '@feathersjs/feathers'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ActionRunData, ActionRunResult } from './actions.schema'

// A "custom service" (no adapter) with an RPC-like custom method.
export class ActionsService {
  constructor(public app: Application) {}

  // Optional: list available actions
  async find(_params?: Params) {
    return [
      { name: 'reindex', description: 'Rebuild search index' },
      { name: 'sync', description: 'Sync external datasource' },
    ]
  }

  // Custom method (must also be listed in actionsMethods in actions.ts + actions.shared.ts)
  async run(data: ActionRunData, _params?: Params): Promise<ActionRunResult> {
    // Put your business logic here:
    // - validate with Zod via hooks
    // - authorize with auth hooks
    // - execute action
    return {
      ok: true,
      action: data.action,
      at: new Date().toISOString(),
    }
  }
}

export const getOptions = (app: Application) => ({ app })
