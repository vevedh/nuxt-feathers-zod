if (process.env.NFZ_ALLOW_DIRECT_FOLDER_PUBLISH === 'true') {
  console.warn('[release] Direct folder publishing was explicitly enabled. The immutable tarball workflow remains recommended.')
  process.exit(0)
}

console.error('[release] Direct "npm publish" from the source folder is disabled.')
console.error('[release] Run "bun run release:prepare:publish", then "bun run publish:npm" to publish the exact validated tarball.')
process.exit(1)
