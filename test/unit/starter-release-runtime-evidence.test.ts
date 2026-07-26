import { describe, expect, it } from 'vitest'

import { assertStarterRuntimeProcessHealthy } from '../../examples/nfz-quasar-unocss-pinia-starter/scripts/runtime-evidence.mjs'

describe('starter release runtime evidence', () => {
  it('accepts an alive runtime without an optional ready diagnostic line', () => {
    expect(() => assertStarterRuntimeProcessHealthy({
      output: '[NFZ server] database infrastructure ready=true',
      exitCode: null,
      signalCode: null,
    })).not.toThrow()
  })

  it('rejects an explicit bootstrap failure', () => {
    expect(() => assertStarterRuntimeProcessHealthy({
      output: '[NFZ bootstrap] instance=default status=failed phase=services',
      exitCode: null,
      signalCode: null,
    })).toThrow(/bootstrap failure/)
  })

  it('rejects a server process that exited before validation completed', () => {
    expect(() => assertStarterRuntimeProcessHealthy({
      output: 'server output',
      exitCode: 1,
      signalCode: null,
    })).toThrow(/exit code 1/)
  })

  it('rejects a server process terminated by a signal', () => {
    expect(() => assertStarterRuntimeProcessHealthy({
      output: 'server output',
      exitCode: null,
      signalCode: 'SIGTERM',
    })).toThrow(/signal SIGTERM/)
  })
})
