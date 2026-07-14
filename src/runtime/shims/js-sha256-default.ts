import * as sha256Module from 'js-sha256/src/sha256.js'

const defaultExport = (sha256Module as any).default ?? (sha256Module as any).sha256 ?? sha256Module

export default defaultExport
export * from 'js-sha256/src/sha256.js'
