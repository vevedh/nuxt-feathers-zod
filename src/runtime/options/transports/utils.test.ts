import { describe, expect, it } from 'vitest'
import { NuxtFeathersError } from '../../errors'
import { checkPath } from './utils'

describe('checkPath', () => {
  it('should throw an error if path does not start with /', () => {
    expect(() => checkPath('invalidPath')).toThrow(NuxtFeathersError)
    expect(() => checkPath('invalidPath')).toThrow('transport path option must start with /! Current path: invalidPath')
  })

  it('should throw an error if path is not a valid URL path', () => {
    expect(() => checkPath('/invalid path')).toThrow(NuxtFeathersError)
    expect(() => checkPath('/invalid path')).toThrow('transport path option must be a valid URL path! /invalid path is not valid.')
  })

  it('should not throw an error for valid paths', () => {
    expect(() => checkPath('/valid-path')).not.toThrow()
    expect(() => checkPath('/another/valid-path')).not.toThrow()
  })
})
