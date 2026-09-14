import { filterQuery } from '@feathersjs/adapter-commons'
import { describe, expect, it } from 'vitest'

describe('feathersjs 5.0.49 nested query operator validation', () => {
  it('rejects an unknown operator nested below $or arrays', () => {
    let thrown: unknown

    try {
      filterQuery({
        $or: [[{ $where: '1==1' }]],
      })
    }
    catch (error) {
      thrown = error
    }

    expect(thrown).toMatchObject({
      name: 'BadRequest',
      message: 'Invalid query parameter $where',
    })
  })

  it('keeps valid nested comparison operators accepted', () => {
    const { filters } = filterQuery({
      $or: [{ value: { $gte: 10 } }],
    })

    expect(filters).toEqual({
      $or: [{ value: { $gte: 10 } }],
    })
  })
})
