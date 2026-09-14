import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { zodQuerySyntax } from './query'
import { getZodValidator } from './validators'

const schema = z.object({
  status: z.enum(['draft', 'active', 'archived']),
  priority: z.number(),
  title: z.string(),
})

describe('zod 3 Feathers query boundary', () => {
  it('parses enum, select, sort, in and nin operators with the same runtime', () => {
    const query = zodQuerySyntax(schema)
    const parsed = query.parse({
      status: { $in: ['active', 'draft'], $nin: ['archived'] },
      $select: 'status,title',
      $sort: { priority: -1 },
      $limit: '10',
      $skip: '0',
    })

    expect(parsed).toEqual({
      status: { $in: ['active', 'draft'], $nin: ['archived'] },
      $select: ['status', 'title'],
      $sort: { priority: -1 },
      $limit: 10,
      $skip: 0,
    })
  })

  it('coerces integer query values and sort order without changing string identifier semantics', () => {
    const portableSchema = z.object({
      id: z.number().int(),
      uuid: z.string().uuid(),
      bigintId: z.string().regex(/^-?\d+$/),
      title: z.string(),
    })
    const query = zodQuerySyntax(portableSchema)
    const parsed = query.parse({
      id: { $gte: '40', $in: ['41', '42'] },
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      bigintId: '9223372036854775807',
      $sort: { id: '-1' },
    })

    expect(parsed).toEqual({
      id: { $gte: 40, $in: [41, 42] },
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      bigintId: '9223372036854775807',
      $sort: { id: -1 },
    })
  })

  it('is accepted by the Feathers-compatible validator', async () => {
    const validator = getZodValidator(zodQuerySyntax(schema), { kind: 'query' }) as any
    const result = await validator({ status: 'active' }, { path: 'messages', method: 'find' })
    expect(result.status).toBe('active')
  })
})
