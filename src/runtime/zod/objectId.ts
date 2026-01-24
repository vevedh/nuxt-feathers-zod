import { ObjectId } from 'mongodb'
import { z } from 'zod'

/**
 * MongoDB ObjectId schema that accepts:
 * - ObjectId instances
 * - 24-hex strings (converted to ObjectId)
 * - undefined (optional)
 */
export function objectIdSchema() {
  return z
    .instanceof(ObjectId)
    .optional()
    .or(
      z.string().transform((input, ctx) => {
        try {
          return ObjectId.createFromHexString(input)
        } catch (err: any) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err?.message ?? 'Invalid ObjectId',
          })
          return z.NEVER
        }
      })
    )
}
