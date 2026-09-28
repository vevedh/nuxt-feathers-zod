import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)

const binaryExtensions = new Set([
  '.gif', '.gz', '.ico', '.jpeg', '.jpg', '.pdf', '.png', '.tgz', '.ttf', '.webp', '.woff', '.woff2', '.zip',
])

const violations = []

for (const file of tracked) {
  const lower = file.toLowerCase()
  if ([...binaryExtensions].some(extension => lower.endsWith(extension)))
    continue

  let content
  try {
    content = readFileSync(file)
  }
  catch {
    continue
  }

  // Skip unclassified binary files. Text policy is enforced only when NUL is absent.
  if (content.includes(0))
    continue

  if (content.includes(Buffer.from('\r\n')))
    violations.push(file)
}

if (violations.length > 0) {
  console.error('LF line-ending policy violation in tracked text files:')
  for (const file of violations)
    console.error(`- ${file}`)
  process.exit(1)
}

console.log(`✓ tracked text files use LF (${tracked.length} tracked paths inspected)`)
