import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getServerAuthContents } from './authentication'

describe('server authentication template', () => {
  it('injects authentication config through app.set before creating AuthenticationService', () => {
    const code = getServerAuthContents({
      auth: {
        authStrategies: ['local', 'jwt'],
      },
    } as any)()

    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
      fileName: '.nuxt/feathers/server/authentication.ts',
      reportDiagnostics: true,
    })

    const messages = (transpiled.diagnostics ?? []).map((diagnostic: ts.Diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )

    expect(messages).toEqual([])
    expect(code).toContain("app.set('authentication', authOptions)")
    expect(code).toContain("new AuthenticationService(app, 'authentication')")
    expect(code).not.toContain("new AuthenticationService(app, 'authentication', authOptions)")
  })
})
