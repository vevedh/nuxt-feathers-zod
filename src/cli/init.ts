import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import consola from 'consola'

type Adapter = 'mongodb' | 'memory'

export interface InitProjectOptions {
  projectRoot: string
  servicesDir: string
  withUsers: boolean
  adapter: Adapter
  auth: boolean
  docs: boolean
  dry: boolean
  force: boolean
  printDiff: boolean

  // Optional: database bootstrap (currently only mongodb)
  database?: 'mongodb' | 'none'
  envPath?: string
  composePath?: string
  mongoUser?: string
  mongoPassword?: string
  mongoDb?: string
  mongoPort?: string
}

const CONFIG_CANDIDATES = [
  'nuxt.config.ts',
  'nuxt.config.mts',
  'nuxt.config.js',
  'nuxt.config.mjs',
]

function pickNuxtConfigFile(projectRoot: string) {
  for (const f of CONFIG_CANDIDATES) {
    const p = join(projectRoot, f)
    if (existsSync(p))
      return p
  }
  return null
}

/**
 * INIT v2: Prefer AST-based patching using the TypeScript compiler API.
 * This is resilient to real-world nuxt.config layouts:
 * - multiline arrays
 * - defineNuxtConfig(() => ({ ... }))
 * - object spreads
 *
 * If AST patching can't confidently update the file, we fallback to a minimal regex patch.
 */

type PatchResult = { changed: boolean, content: string, reason: string }


function printUnifiedDiff(label: string, before: string, after: string) {
  const a = before.split(/\r?\n/)
  const b = after.split(/\r?\n/)

  // LCS DP (OK for small config files)
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0))

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const out: string[] = []
  out.push(`--- ${label}`)
  out.push(`+++ ${label} (patched)`)

  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push(` ${a[i]}`)
      i++; j++
      continue
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`-${a[i]}`)
      i++
    } else {
      out.push(`+${b[j]}`)
      j++
    }
  }
  while (i < n) { out.push(`-${a[i]}`); i++ }
  while (j < m) { out.push(`+${b[j]}`); j++ }

  consola.box(out.join('\n'))
}


function regexPatchNuxtConfig(raw: string, servicesDirName: string, mongoDefaultUrl?: string): PatchResult {
  // Already configured -> do nothing.
  // (We still may need to add mongodb.url, so we only short-circuit if feathers already exists and includes mongodb.url.)
  const hasNfzModule = /['"]nuxt-feathers-zod['"]/.test(raw)
  const hasFeathersConfig = /\bfeathers\s*:/m.test(raw)
  const hasDatabaseConfig = /\bdatabase\s*:/m.test(raw)

  if (hasNfzModule && hasFeathersConfig && (!mongoDefaultUrl || hasDatabaseConfig))
    return { changed: false, content: raw, reason: 'already configured' }

  let next = raw

  // Patch modules array if present (array literal only; regex fallback is conservative)
  if (/\bmodules\s*:\s*\[/m.test(next)) {
    next = next.replace(
      /(\bmodules\s*:\s*\[[^\]]*\]\s*,?\s*\n)/m,
      (full, start, inner, end) => {
        if (/['"]nuxt-feathers-zod['"]/.test(full))
          return full
        const trimmed = String(inner).trim()
        if (!trimmed)
          return `${start}\n    'nuxt-feathers-zod',\n  ${end}`
        const prefix = /^\s*\n/.test(inner) ? '' : ' '
        return `${start}${prefix}'nuxt-feathers-zod',${inner}${end}`
      },
    )
  }

  const escapeSingleQuotes = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  const feathersBlockLines = [
    '  feathers: {',
    `    servicesDirs: ['${servicesDirName}'],`,
    ...(mongoDefaultUrl
      ? [
          '    database: {',
          '      mongo: {',
          `        url: process.env.MONGODB_URL || '${escapeSingleQuotes(mongoDefaultUrl)}',`,
          '      },',
          '    },',
        ]
      : []),
    '  },',
    '',
  ].join('\n')

  // Fix common typo: servicesDir (singular) -> servicesDirs (plural)
  const hasFeathersBlock = /\bfeathers\s*:/m.test(next)
  const hasLegacyServicesDir = /\bservicesDir\s*:/m.test(next)
  const hasServicesDirs = /\bservicesDirs\s*:/m.test(next)

  if (hasFeathersBlock && hasLegacyServicesDir && !hasServicesDirs) {
    next = next.replace(/\bservicesDir\s*:/m, 'servicesDirs:')
  }

  // Inject feathers block if missing and we can find modules block
  if (!/\bfeathers\s*:/m.test(next) && /\bmodules\s*:\s*\[[^\]]*\]/m.test(next)) {
    next = next.replace(
      /(?:\bmodules\s*:\s*\[[^\]]*\]\s*,?\s*\n)/m,
      (m) => `${m}${feathersBlockLines}\n`,
    )
  }

  // If feathers exists but database.mongo is requested, try a tiny injection (very conservative)
  if (mongoDefaultUrl && /\bfeathers\s*:/m.test(next) && !/\bdatabase\s*:/m.test(next)) {
    const mongoBlock = [
      '    database: {',
      '      mongo: {',
      `        url: process.env.MONGODB_URL || '${escapeSingleQuotes(mongoDefaultUrl)}',`,
      '      },',
      '    },',
    ].join('\n')

    next = next.replace(
      /(?:\bfeathers\s*:\s*\{)/m,
      m => `${m}\n${mongoBlock}`,
    )
  }

  // If no modules block, inject a compact defaults block right after defineNuxtConfig({
  if (next === raw) {
    const anchor = /defineNuxtConfig\(\{\s*\n?/m
    if (anchor.test(next)) {
      const insert = [
        '  // Added by nuxt-feathers-zod init (safe defaults)',
        "  modules: ['nuxt-feathers-zod'],",
        feathersBlockLines.trimEnd(),
        '',
      ].join('\n')
      next = next.replace(anchor, (m) => `${m}${insert}\n`)
    }
  }

  return { changed: next !== raw, content: next, reason: 'regex fallback patch' }
}
async function astPatchNuxtConfig(
  raw: string,
  servicesDirName: string,
  mongoDefaultUrl?: string,
): Promise<PatchResult | null> {
  // Import lazily so init stays fast in normal cases
  const ts = await import('typescript')
  try {

  const sourceFile = ts.createSourceFile(
    'nuxt.config.ts',
    raw,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

  const exportAssign = sourceFile.statements.find(s => ts.isExportAssignment(s)) as any | undefined
  if (!exportAssign)
    return null

  const expr = exportAssign.expression as any

  function getIdText(n: any): string | null {
    if (!n) return null
    if (ts.isIdentifier(n)) return n.text
    return null
  }

  function getPropName(p: any): string | null {
    if (!p || !p.name) return null
    if (ts.isIdentifier(p.name)) return p.name.text
    if (ts.isStringLiteral(p.name)) return p.name.text
    return null
  }

  function findProp(obj: any, name: string): any | null {
    const prop = obj.properties.find((p: any) => ts.isPropertyAssignment(p) && getPropName(p) === name)
    return prop || null
  }

  function ensureStringInArray(arr: any, value: string): { node: any, changed: boolean } {
    if (!ts.isArrayLiteralExpression(arr))
      return { node: arr, changed: false }

    const exists = arr.elements.some((e: any) => ts.isStringLiteral(e) && e.text === value)
    if (exists)
      return { node: arr, changed: false }

    const newElts = [ts.factory.createStringLiteral(value), ...arr.elements]
    return { node: ts.factory.updateArrayLiteralExpression(arr, newElts), changed: true }
  }

  function ensureModules(obj: any): { obj: any, changed: boolean, warnings: string[] } {
    const warnings: string[] = []
    let changed = false

    const modulesProp = findProp(obj, 'modules')
    if (!modulesProp) {
      const newModules = ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('modules'),
        ts.factory.createArrayLiteralExpression([ts.factory.createStringLiteral('nuxt-feathers-zod')], true),
      )
      const newObj = ts.factory.updateObjectLiteralExpression(obj, [newModules, ...obj.properties])
      return { obj: newObj, changed: true, warnings }
    }

    const init = modulesProp.initializer
    if (!ts.isArrayLiteralExpression(init)) {
      warnings.push('modules is not an array literal; skipped modules patch')
      return { obj, changed: false, warnings }
    }

    const ensured = ensureStringInArray(init, 'nuxt-feathers-zod')
    if (ensured.changed) {
      changed = true
      const updatedProp = ts.factory.updatePropertyAssignment(modulesProp, modulesProp.name, ensured.node)
      const newProps = obj.properties.map((p: any) => (p === modulesProp ? updatedProp : p))
      return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
    }

    return { obj, changed, warnings }
  }

  function ensureFeathers(obj: any, extra?: { mongodbUrlExpr?: any }): { obj: any, changed: boolean, warnings: string[] } {
    const warnings: string[] = []
    let changed = false

    const feathersProp = findProp(obj, 'feathers')
    if (!feathersProp) {
      const newFeathers = ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('feathers'),
        ts.factory.createObjectLiteralExpression([
          ts.factory.createPropertyAssignment(
            ts.factory.createIdentifier('servicesDirs'),
            ts.factory.createArrayLiteralExpression([ts.factory.createStringLiteral(servicesDirName)], true),
          ),
          ...(extra?.mongodbUrlExpr
            ? [ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier('database'),
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier('mongo'),
                    ts.factory.createObjectLiteralExpression([
                      ts.factory.createPropertyAssignment(ts.factory.createIdentifier('url'), extra.mongodbUrlExpr),
                    ], true),
                  ),
                ], true),
              )]
            : []),
        ], true),
      )
      const newObj = ts.factory.updateObjectLiteralExpression(obj, [...obj.properties, newFeathers])
      return { obj: newObj, changed: true, warnings }
    }

    const init = feathersProp.initializer
    if (!ts.isObjectLiteralExpression(init)) {
      warnings.push('feathers is not an object literal; skipped feathers patch')
      return { obj, changed: false, warnings }
    }

    let sdProp = findProp(init, 'servicesDirs')
    // Common typo compatibility: servicesDir -> servicesDirs
    const sdSingular = !sdProp ? findProp(init, 'servicesDir') : null
    if (!sdProp && sdSingular) {
      changed = true
      const renamed = ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('servicesDirs'),
        sdSingular.initializer,
      )
      const newInitProps = init.properties
        .filter((p: any) => p !== sdSingular)
        .map((p: any) => p)
      const newInit = ts.factory.updateObjectLiteralExpression(init, [...newInitProps, renamed])
      const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
      const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
      return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
    }

    if (!sdProp) {
      changed = true
      const newSd = ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('servicesDirs'),
        ts.factory.createArrayLiteralExpression([ts.factory.createStringLiteral(servicesDirName)], true),
      )
      const newInit = ts.factory.updateObjectLiteralExpression(init, [...init.properties, newSd])
      const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
      const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
      return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
    }

    const sdInit = sdProp.initializer
    if (!ts.isArrayLiteralExpression(sdInit)) {
      warnings.push('feathers.servicesDirs is not an array literal; skipped servicesDirs patch')
      return { obj, changed: false, warnings }
    }

    const ensured = ensureStringInArray(sdInit, servicesDirName)
    if (ensured.changed) {
      changed = true
      const updatedSdProp = ts.factory.updatePropertyAssignment(sdProp, sdProp.name, ensured.node)
      const newInitProps = init.properties.map((p: any) => (p === sdProp ? updatedSdProp : p))
      const newInit = ts.factory.updateObjectLiteralExpression(init, newInitProps)
      const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
      const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
      return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
    }

    // Ensure feathers.database.mongo.url if requested (only if feathers is an object literal)
    if (extra?.mongodbUrlExpr) {
      const databaseProp = findProp(init, 'database')
      const makeMongoObj = () => ts.factory.createObjectLiteralExpression([
        ts.factory.createPropertyAssignment(ts.factory.createIdentifier('url'), extra.mongodbUrlExpr),
      ], true)

      const makeDatabaseObj = () => ts.factory.createObjectLiteralExpression([
        ts.factory.createPropertyAssignment(ts.factory.createIdentifier('mongo'), makeMongoObj()),
      ], true)

      if (!databaseProp) {
        changed = true
        const newDatabase = ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('database'),
          makeDatabaseObj(),
        )
        const newInit = ts.factory.updateObjectLiteralExpression(init, [...init.properties, newDatabase])
        const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
        const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
        return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
      }

      const databaseInit = databaseProp.initializer
      if (!ts.isObjectLiteralExpression(databaseInit)) {
        warnings.push('feathers.database is not an object literal; skipped database.mongo.url patch')
        return { obj, changed, warnings }
      }

      const mongoProp = findProp(databaseInit, 'mongo')
      if (!mongoProp) {
        changed = true
        const newMongo = ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('mongo'),
          makeMongoObj(),
        )
        const newDatabaseInit = ts.factory.updateObjectLiteralExpression(
          databaseInit,
          [...databaseInit.properties, newMongo],
        )
        const updatedDatabaseProp = ts.factory.updatePropertyAssignment(databaseProp, databaseProp.name, newDatabaseInit)
        const newInitProps = init.properties.map((p: any) => (p === databaseProp ? updatedDatabaseProp : p))
        const newInit = ts.factory.updateObjectLiteralExpression(init, newInitProps)
        const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
        const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
        return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
      }

      const mongoInit = mongoProp.initializer
      if (ts.isObjectLiteralExpression(mongoInit)) {
        const urlProp = findProp(mongoInit, 'url')
        if (!urlProp) {
          changed = true
          const newUrl = ts.factory.createPropertyAssignment(ts.factory.createIdentifier('url'), extra.mongodbUrlExpr)
          const newMongoInit = ts.factory.updateObjectLiteralExpression(mongoInit, [...mongoInit.properties, newUrl])
          const updatedMongoProp = ts.factory.updatePropertyAssignment(mongoProp, mongoProp.name, newMongoInit)
          const newDatabaseInitProps = databaseInit.properties.map((p: any) => (p === mongoProp ? updatedMongoProp : p))
          const newDatabaseInit = ts.factory.updateObjectLiteralExpression(databaseInit, newDatabaseInitProps)
          const updatedDatabaseProp = ts.factory.updatePropertyAssignment(databaseProp, databaseProp.name, newDatabaseInit)
          const newInitProps = init.properties.map((p: any) => (p === databaseProp ? updatedDatabaseProp : p))
          const newInit = ts.factory.updateObjectLiteralExpression(init, newInitProps)
          const updatedFeathersProp = ts.factory.updatePropertyAssignment(feathersProp, feathersProp.name, newInit)
          const newProps = obj.properties.map((p: any) => (p === feathersProp ? updatedFeathersProp : p))
          return { obj: ts.factory.updateObjectLiteralExpression(obj, newProps), changed, warnings }
        }
      }
      else {
        warnings.push('feathers.database.mongo is not an object literal; skipped database.mongo.url patch')
      }
    }



    return { obj, changed, warnings }
  }

  function extractConfigObject(e: any): { kind: 'object', obj: any, wrap: (updatedObj: any) => any } | null {
    // export default defineNuxtConfig({ ... })
    if (ts.isCallExpression(e) && getIdText(e.expression) === 'defineNuxtConfig') {
      const arg0 = e.arguments[0]
      // defineNuxtConfig({ ... })
      if (arg0 && ts.isObjectLiteralExpression(arg0)) {
        return {
          kind: 'object',
          obj: arg0,
          wrap: updatedObj => ts.factory.updateCallExpression(
            e,
            e.expression,
            e.typeArguments,
            [updatedObj, ...e.arguments.slice(1)],
          ),
        }
      }

      // defineNuxtConfig(() => ({ ... }))
      if (arg0 && (ts.isArrowFunction(arg0) || ts.isFunctionExpression(arg0))) {
        const body = arg0.body
        // () => ({ ... })
        if (ts.isParenthesizedExpression(body) && ts.isObjectLiteralExpression(body.expression)) {
          const innerObj = body.expression
          return {
            kind: 'object',
            obj: innerObj,
            wrap: (updatedObj) => {
              const newBody = ts.factory.updateParenthesizedExpression(body, updatedObj)
              const newFn = ts.isArrowFunction(arg0)
                ? ts.factory.updateArrowFunction(
                    arg0,
                    arg0.modifiers,
                    arg0.typeParameters,
                    arg0.parameters,
                    arg0.type,
                    arg0.equalsGreaterThanToken,
                    newBody,
                  )
                : ts.factory.updateFunctionExpression(
                    arg0,
                    arg0.modifiers,
                    arg0.asteriskToken,
                    arg0.name,
                    arg0.typeParameters,
                    arg0.parameters,
                    arg0.type,
                    arg0.body,
                  )
              const newArgs = [newFn, ...e.arguments.slice(1)]
              return ts.factory.updateCallExpression(e, e.expression, e.typeArguments, newArgs)
            },
          }
        }

        // () => { return { ... } }
        if (ts.isBlock(body)) {
          const ret = body.statements.find((s: any) => (
            ts.isReturnStatement(s)
            && s.expression
            && ts.isObjectLiteralExpression(s.expression)
          ))
          if (ret && ts.isReturnStatement(ret) && ret.expression) {
            const innerObj = ret.expression as any
            return {
              kind: 'object',
              obj: innerObj,
              wrap: (updatedObj) => {
                const newStatements = body.statements.map((s: any) => {
                  if (s === ret) return ts.factory.updateReturnStatement(ret, updatedObj)
                  return s
                })
                const newBlock = ts.factory.updateBlock(body, newStatements)
                const newFn = ts.isArrowFunction(arg0)
                  ? ts.factory.updateArrowFunction(
                      arg0,
                      arg0.modifiers,
                      arg0.typeParameters,
                      arg0.parameters,
                      arg0.type,
                      arg0.equalsGreaterThanToken,
                      newBlock,
                    )
                  : ts.factory.updateFunctionExpression(
                      arg0,
                      arg0.modifiers,
                      arg0.asteriskToken,
                      arg0.name,
                      arg0.typeParameters,
                      arg0.parameters,
                      arg0.type,
                      newBlock,
                    )
                const newArgs = [newFn, ...e.arguments.slice(1)]
                return ts.factory.updateCallExpression(e, e.expression, e.typeArguments, newArgs)
              },
            }
          }
        }
      }

      return null
    }

    // export default { ... }
    if (ts.isObjectLiteralExpression(e)) {
      return {
        kind: 'object',
        obj: e,
        wrap: updatedObj => updatedObj,
      }
    }

    return null
  }

  const extracted = extractConfigObject(expr)
  if (!extracted)
    return null

  // If already configured -> short-circuit
  const hasModules = extracted.obj.properties.some((p: any) => ts.isPropertyAssignment(p) && getPropName(p) === 'modules')
  const hasFeathers = extracted.obj.properties.some((p: any) => ts.isPropertyAssignment(p) && getPropName(p) === 'feathers')
  if (hasModules && hasFeathers) {
    // still might be missing our module or servicesDirs, so continue; but keep reason consistent
  }

  // Optional: include mongodb.url configuration when requested (via init)
  // Expression: process.env.MONGODB_URL || '<defaultUrl>'
  let mongodbUrlExpr: any | undefined
  if (mongoDefaultUrl) {
    const processIdent = ts.factory.createIdentifier('process')
    const envAccess = ts.factory.createPropertyAccessExpression(processIdent, 'env')
    const urlAccess = ts.factory.createPropertyAccessExpression(envAccess, 'MONGODB_URL')
    mongodbUrlExpr = ts.factory.createBinaryExpression(
      urlAccess,
      ts.SyntaxKind.BarBarToken,
      ts.factory.createStringLiteral(mongoDefaultUrl),
    )
  }

  const m = ensureModules(extracted.obj)
  const f = ensureFeathers(m.obj, mongodbUrlExpr ? { mongodbUrlExpr } : undefined)

  const changed = m.changed || f.changed
  const warnings = [...m.warnings, ...f.warnings].filter(Boolean)

  if (!changed && warnings.length === 0)
    return { changed: false, content: raw, reason: 'already configured' }

  const newExpr = extracted.wrap(f.obj)
  if (!newExpr)
    return null
  const newExport = ts.factory.updateExportAssignment(exportAssign, exportAssign.modifiers, newExpr)
  const newStatements = sourceFile.statements.map((s: any) => (s === exportAssign ? newExport : s))
  const newSourceFile = ts.factory.updateSourceFile(sourceFile, newStatements)

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const content = printer.printFile(newSourceFile)

  const reason = warnings.length
    ? `ast patch (with warnings: ${warnings.join('; ')})`
    : 'ast patch'

  return { changed: content !== raw, content, reason }
  } catch (e) {
    // Fallback to regex patch if AST patch fails (Windows/Bun edge cases)
    return null
  }
}

async function patchNuxtConfig(
  raw: string,
  servicesDirName: string,
  mongoDefaultUrl: string | undefined,
  opts: { printDiff: boolean, label?: string },
): Promise<PatchResult> {
  // AST patch is preferred but can fail on some TS/Bun/Windows edge cases.
  // Never crash init: fall back to regex patch.
  const looksPatchable =
    /export\s+default\b/.test(raw)
    && (/defineNuxtConfig\s*\(/.test(raw) || /export\s+default\s*\{/.test(raw))

  if (looksPatchable) {
    try {
      const res = await astPatchNuxtConfig(raw, servicesDirName, mongoDefaultUrl)
      if (res) return res
    } catch {
      // ignore
    }
  }

  return regexPatchNuxtConfig(raw, servicesDirName, mongoDefaultUrl)
}

export async function initProject(opts: InitProjectOptions) {
  const configPath = pickNuxtConfigFile(opts.projectRoot)
  if (!configPath) {
    consola.warn('No nuxt.config.* found at project root. Nothing to init.')
    return
  }

  const servicesDirName = relative(resolve(opts.projectRoot), resolve(opts.servicesDir)).replace(/\\/g, '/')

  // Optional database bootstrap (mongodb)
  const database = opts.database ?? 'none'
  const mongoUser = (opts.mongoUser?.trim() || 'nfzadmin')
  const mongoPassword = (opts.mongoPassword?.trim() || 'nfzadmin123')
  const mongoDb = (opts.mongoDb?.trim() || 'nfz')
  const mongoPort = (opts.mongoPort?.trim() || '27017')

  const mongoDefaultUrl = database === 'mongodb'
    ? `mongodb://${mongoUser}:${mongoPassword}@localhost:${mongoPort}/${mongoDb}?authSource=admin`
    : undefined

  const raw = await readFile(configPath, 'utf8')
  const { changed, content, reason } = await patchNuxtConfig(
    raw,
    servicesDirName,
    mongoDefaultUrl,
    { printDiff: opts.printDiff, label: configPath },
  )

  if (!changed) {
    consola.info(`nuxt.config already looks initialized (${reason}).`)
  }
  else {
    if (opts.printDiff) {
      printUnifiedDiff(configPath, raw, content)
    }
    if (opts.dry) {
      consola.box(`DRY RUN: would patch ${configPath}

${content}`)
    }
    else {
      await writeFile(configPath, content, 'utf8')
      consola.success(`Patched ${configPath} (${reason}).`)
    }
  }

  // Optional: create .env + docker compose template for MongoDB
  if (database === 'mongodb') {
    const envPath = opts.envPath ? resolve(opts.projectRoot, opts.envPath) : join(opts.projectRoot, '.env')
    // Default filename matches the user's convention
    const composePath = opts.composePath
      ? resolve(opts.projectRoot, opts.composePath)
      : join(opts.projectRoot, 'docker-compose.yaml')

    // Matches the reference .env provided by the user
    const envTemplate = [
      `MONGODB_URL=${mongoDefaultUrl}`,
      `MONGODB_ADMIN=${mongoUser}`,
      `MONGODB_PASSWORD=${mongoPassword}`,
      'FIRST_USER=nfzuser',
      'FIRST_PASSWORD=nfzpass',
      '',
    ].join('\n')

    const composeTemplate = await readFile(new URL('./templates/docker-compose.mongodb.yml.tpl', import.meta.url), 'utf8')

    if (opts.dry) {
      consola.box(`DRY RUN: would write ${relative(opts.projectRoot, envPath) || '.env'}\n\n${envTemplate}`)
      consola.box(`DRY RUN: would write ${relative(opts.projectRoot, composePath)}\n\n${composeTemplate}`)
    }
    else {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(dirname(envPath), { recursive: true })
      await mkdir(dirname(composePath), { recursive: true })

      // .env: create or append missing vars (safe)
      let envExisting = ''
      if (existsSync(envPath))
        envExisting = await readFile(envPath, 'utf8')

      const ensureEnv = (content: string, key: string, value: string) => {
        const re = new RegExp(`^${key}=`, 'm')
        if (re.test(content))
          return content
        return content.trimEnd() + (content.trim() ? '\n' : '') + `${key}=${value}\n`
      }

      let nextEnv = envExisting
      nextEnv = ensureEnv(nextEnv, 'MONGODB_URL', mongoDefaultUrl ?? '')
      nextEnv = ensureEnv(nextEnv, 'MONGODB_ADMIN', mongoUser)
      nextEnv = ensureEnv(nextEnv, 'MONGODB_PASSWORD', mongoPassword)
      // FIRST_* are used by the generated users service (mongodb adapter) for first-run bootstrap
      nextEnv = ensureEnv(nextEnv, 'FIRST_USER', 'nfzuser')
      nextEnv = ensureEnv(nextEnv, 'FIRST_PASSWORD', 'nfzpass')
      await writeFile(envPath, nextEnv, 'utf8')
      consola.success(`Ensured env vars in ${relative(opts.projectRoot, envPath) || '.env'}`)

      // docker compose template
      if (!existsSync(composePath) || opts.force) {
        await writeFile(composePath, composeTemplate, 'utf8')
        consola.success(`Wrote ${relative(opts.projectRoot, composePath)}`)
      }
      else {
        consola.info(`Skipped ${relative(opts.projectRoot, composePath)} (already exists). Use --force to overwrite.`)
      }
    }
  }

  // Ensure services directory exists (harmless if already present)
  if (!opts.dry) {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(opts.servicesDir, { recursive: true })
  }
  consola.success(`Services dir: ${opts.servicesDir}`)

  // Optional: bootstrap users service (recommended first service)
  if (opts.withUsers) {
    const { generateService } = await import('./index')

    await generateService({
      projectRoot: opts.projectRoot,
      servicesDir: opts.servicesDir,
      name: 'users',
      adapter: opts.adapter,
      auth: opts.auth,
      idField: opts.adapter === 'mongodb' ? '_id' : 'id',
      servicePath: undefined,
      collectionName: undefined,
      docs: opts.docs,
      schema: opts.auth ? 'zod' : 'none',
      dry: opts.dry,
      force: opts.force,
    })
  }
  else {
    consola.info('Tip: generate your first service with: bunx nuxt-feathers-zod add service users --auth')
  }
}
