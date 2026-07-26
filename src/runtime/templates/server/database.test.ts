import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { getServerDatabaseContents, getServerDatabaseTypesContents } from './database'

describe('server database registry template', () => {
  it('generates consumer-safe TypeScript without serializing credentials', () => {
    const options = {
      database: {
        default: 'primary',
        connections: {
          primary: {
            name: 'primary',
            type: 'mongodb',
            url: 'mongodb://user:private-password@localhost/app',
          },
        },
      },
    } as any

    for (const [fileName, code] of [
      ['.nuxt/feathers/server/database.ts', getServerDatabaseContents(options)()],
      ['.nuxt/feathers/server/database.d.ts', getServerDatabaseTypesContents(options)()],
    ] as const) {
      const sourceFile = ts.createSourceFile(
        fileName,
        code,
        ts.ScriptTarget.ES2022,
        true,
        ts.ScriptKind.TS,
      ) as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }
      const syntaxMessages = sourceFile.parseDiagnostics.map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      )
      expect(syntaxMessages).toEqual([])

      if (!fileName.endsWith('.d.ts')) {
        const transpiled = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
          fileName,
          reportDiagnostics: true,
        })
        const messages = (transpiled.diagnostics ?? []).map(diagnostic =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        )
        expect(messages).toEqual([])
      }

      expect(code).not.toContain('private-password')
    }

    expect(getServerDatabaseContents(options)()).toContain('createDatabaseInfrastructure')
    expect(getServerDatabaseTypesContents(options)()).toContain('NfzDatabaseRegistry')
  })
})
