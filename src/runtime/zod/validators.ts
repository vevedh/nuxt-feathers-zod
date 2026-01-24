import type { HookContext } from '@feathersjs/feathers'
import type { Validator } from '@feathersjs/schema'
import type { z, ZodTypeAny } from 'zod'
import { VALIDATED } from '@feathersjs/adapter-commons'
import { BadRequest } from '@feathersjs/errors'
import { ZodError } from 'zod'
import { formatZodIssues } from './format'

export type ValidatorKind = 'data' | 'query'

export interface ZodValidatorOptions {
  kind?: ValidatorKind
  message?: string
  useSafeParse?: boolean
}

/**
 * Feathers Schema-compatible validator based on Zod.
 *
 * Notes:
 * - Accepts the extra 3rd argument (ResolverStatus) expected by @feathersjs/schema types.
 * - Marks the validated object with VALIDATED (adapter-commons) to avoid re-validating in adapters.
 * - Supports array data payloads (createMany).
 */
export function getZodValidator<T extends ZodTypeAny>(
  schema: T,
  opts: ZodValidatorOptions = {},
) {
  const kind: ValidatorKind = opts.kind ?? 'data'
  const message
    = opts.message ?? (kind === 'query' ? 'Invalid query' : 'Invalid data')
  const useSafeParse = opts.useSafeParse ?? true

  const validator = (async (
    value: unknown,
    context: HookContext,
    _status?: unknown,
  ): Promise<z.infer<T>> => {
    try {
      const parseOne = async (v: unknown) => {
        if (useSafeParse) {
          const res = schema.safeParse(v)
          if (!res.success) {
            throw new BadRequest(message, {
              errors: formatZodIssues(res.error),
              issues: res.error.issues,
              kind,
              path: context?.path,
              method: context?.method,
            })
          }
          return res.data
        }

        return schema.parse(v)
      }

      const parsed
        = kind === 'data' && Array.isArray(value)
          ? await Promise.all(value.map(parseOne))
          : await parseOne(value)

      // Mark as validated (Feathers convention)
      Object.defineProperty(parsed, VALIDATED, { value: true })

      return parsed
    }
    catch (err: any) {
      if (err instanceof BadRequest)
        throw err

      if (err instanceof ZodError) {
        throw new BadRequest(message, {
          errors: formatZodIssues(err),
          issues: err.issues,
          kind,
          path: context?.path,
          method: context?.method,
        })
      }

      throw err
    }
  }) as unknown as Validator

  return validator
}
