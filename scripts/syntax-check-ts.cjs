const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = [
  ...walk('src').filter(file => /\.(ts|mts|cts)$/.test(file)),
  'nuxt.config.ts',
  'playground/nuxt.config.ts',
]

const errors = []
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if (sourceFile.parseDiagnostics.length) {
    errors.push({
      file,
      diagnostics: sourceFile.parseDiagnostics.map(diagnostic => ({
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        start: diagnostic.start,
        length: diagnostic.length,
      })),
    })
  }
}

if (errors.length) {
  console.error(`Syntax errors found in ${errors.length} file(s).`)
  for (const entry of errors) {
    console.error(`\nFILE: ${entry.file}`)
    for (const diagnostic of entry.diagnostics) {
      console.error(`- ${diagnostic.message} (start=${diagnostic.start}, length=${diagnostic.length})`)
    }
  }
  process.exit(1)
}

console.log(`TypeScript syntax OK for ${files.length} file(s).`)
