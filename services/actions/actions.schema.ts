import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ActionsService } from './actions.class'
import { resolve } from '@feathersjs/schema'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

// -----------------------------------------------------------------------------
// This file shows a clean pattern for **custom method** validation/resolution.
// The important parts are:
// - ActionRunData schema/validator/resolver (validateData + resolveData)
// - ActionRunResult schema/validator/resolver (resolveResult)
// -----------------------------------------------------------------------------

// Data accepted by the custom method `run`
export const actionRunDataSchema = z.object({
  action: z.string().min(1),
  // optional payload (keep it permissive; validate deeper in your app if needed)
  payload: z.unknown().optional(),
})
export type ActionRunData = z.infer<typeof actionRunDataSchema>
export const actionRunDataValidator = getZodValidator(actionRunDataSchema, { kind: 'data' })
export const actionRunDataResolver = resolve<ActionRunData, HookContext<ActionsService>>({})

// Result returned by `run`
export const actionRunResultSchema = z.object({
  ok: z.boolean(),
  action: z.string(),
  at: z.string(), // ISO date
})
export type ActionRunResult = z.infer<typeof actionRunResultSchema>
export const actionRunResultValidator = getZodValidator(actionRunResultSchema, { kind: 'data' })
export const actionRunResultResolver = resolve<ActionRunResult, HookContext<ActionsService>>({})
