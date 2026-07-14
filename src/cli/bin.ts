#!/usr/bin/env node

export {}

const { runCli } = await import('./index')

runCli(process.argv.slice(2)).catch((error) => {
  console.error(error)
  process.exit(1)
})
