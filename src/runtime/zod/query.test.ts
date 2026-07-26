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

  it('is accepted by the Feathers-compatible validator', async () => {
    const validator = getZodValidator(zodQuerySyntax(schema), { kind: 'query' }) as any
    const result = await validator({ status: 'active' }, { path: 'messages', method: 'find' })
    expect(result.status).toBe('active')
  })
})
