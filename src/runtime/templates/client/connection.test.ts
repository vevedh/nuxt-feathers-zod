import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getClientConnectionContents } from './connection'

describe('client connection template', () => {
  it('prefers REST in embedded auto mode and keeps remote auto mode available', () => {
    const code = getClientConnectionContents({
      transports: {
        rest: { path: '/feathers', framework: 'koa' },
        websocket: { path: '/socket.io', connectTimeout: 45000, transports: ['websocket'] },
      },
    } as any, {} as any)()

    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
      fileName: '.nuxt/feathers/client/connection.ts',
      reportDiagnostics: true,
    })

    const messages = (transpiled.diagnostics ?? []).map((diagnostic: ts.Diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )

    expect(messages).toEqual([])
    expect(code).toContain("const requestedTransport = overrides?.transport ?? 'auto'")
    expect(code).toContain("const transport = resolveTransport()")
    expect(code).toContain("if (mode === 'remote')\n        return HAS_SOCKET ? 'socketio' : 'rest'")
    expect(code).toContain("return HAS_REST ? 'rest' : 'socketio'")
  })
})
