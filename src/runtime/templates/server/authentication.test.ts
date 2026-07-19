import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { getServerAuthContents } from './authentication'

describe('server authentication template', () => {
  it('delegates provider registration and secret resolution to the secured runtime', () => {
    const code = getServerAuthContents({ auth: { authStrategies: ['local', 'jwt'] } } as any)()
    const transpiled = ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      fileName: '.nuxt/feathers/server/authentication.ts',
      reportDiagnostics: true,
    })
    const messages = (transpiled.diagnostics ?? []).map(diagnostic =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )

    expect(messages).toEqual([])
    expect(code).toContain("from 'nuxt-feathers-zod/server-auth'")
    expect(code).toContain('await configureNfzAuthentication(app, authOptions)')
    expect(code).not.toContain('new AuthenticationService')
  })
})
