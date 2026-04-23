import { z } from 'zod'

export const authAccountSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  password: z.string().optional(),
})

export type AuthAccount = z.infer<typeof authAccountSchema>
