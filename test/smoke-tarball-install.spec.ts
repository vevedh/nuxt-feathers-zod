import { describe, expect, it } from 'vitest'
import {
  createBunInstallArguments,
  selectSmokePackageManager,
} from '../scripts/smoke-tarball-install.mjs'

describe('tarball smoke package-manager selection', () => {
  it('uses npm by default for a Windows consumer install', () => {
    expect(selectSmokePackageManager({
      platform: 'win32',
      forced: undefined,
      runningWithBun: true,
      bunAvailable: true,
      npmAvailable: true,
    })).toBe('npm')
  })

  it('keeps an explicit Bun smoke request on Windows', () => {
    expect(selectSmokePackageManager({
      platform: 'win32',
      forced: 'bun',
      runningWithBun: true,
      bunAvailable: true,
      npmAvailable: true,
    })).toBe('bun')
  })

  it('uses an isolated copyfile cache when Bun is selected', () => {
    const args = createBunInstallArguments('C:/temp/nfz-smoke-cache')

    expect(args).toContain('--backend=copyfile')
    expect(args).toContain('--linker=hoisted')
    expect(args).toContain('--cache-dir')
    expect(args).toContain('C:/temp/nfz-smoke-cache')
    expect(args).toContain('--concurrent-scripts=1')
  })
})
