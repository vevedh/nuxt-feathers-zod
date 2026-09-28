import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const paths = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'buffer' },
)
  .toString('utf8')
  .split('\0')
  .filter(Boolean)

const binaryExtensions = new Set([
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.tgz',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
  '.zip',
])

const changed = []

for (const file of paths) {
  const lower = file.toLowerCase()

  if (
    [...binaryExtensions].some(
      extension => lower.endsWith(extension),
    )
  ) {
    continue
  }

  let content

  try {
    content = readFileSync(file)
  }
  catch {
    continue
  }

  // Preserve binary files.
  if (content.includes(0))
    continue

  // Convert CRLF to LF without changing other bytes.
  if (!content.includes(Buffer.from('\r\n')))
    continue

  const normalized = Buffer.from(
    content.toString('utf8').replace(/\r\n/g, '\n'),
    'utf8',
  )

  writeFileSync(file, normalized)

  changed.push(file)
}

console.log(
  `Normalized ${changed.length} text files to LF:`,
)

for (const file of changed)
  console.log(`- ${file}`)