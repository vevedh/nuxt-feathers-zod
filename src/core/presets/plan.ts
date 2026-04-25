import type { PresetId, PresetParams, PresetPlan } from './types'
import { getPreset, isPresetId } from './presets'

function s(v: any, fallback = '') { return (v == null ? fallback : String(v)) }

export function computePlan(presetId: PresetId, params: PresetParams = {}): PresetPlan {
  const def = getPreset(presetId)
  if (!def) {
    // should not happen if caller validated
    throw new Error(`Unknown preset: ${presetId}`)
  }

  const servicesDir = s(params.servicesDir, 'services')
  const mongodbUrl = s(params.mongodbUrl, '')
  const localUsernameField = s(params.localUsernameField, 'userId')
  const localPasswordField = s(params.localPasswordField, 'password')
  const firstUser = s(params.firstUser, 'admin')
  const firstPassword = s(params.firstPassword, 'changeme')
  const writeDockerCompose = !!params.writeDockerCompose
  const force = params.force !== false

  const command = ['bunx', 'nuxt-feathers-zod', 'init', '--preset', def.cliPreset]
  if (force)
    command.push('--force')

  const env: Record<string, string> = {}
  if (mongodbUrl)
    env.MONGODB_URL = mongodbUrl
  if (firstUser)
    env.FIRST_USER = firstUser
  if (firstPassword)
    env.FIRST_PASSWORD = firstPassword
  // Optional knobs read by init CLI (future-proof)
  if (localUsernameField)
    env.NFZ_LOCAL_USERNAME_FIELD = localUsernameField
  if (localPasswordField)
    env.NFZ_LOCAL_PASSWORD_FIELD = localPasswordField
  if (servicesDir)
    env.NFZ_SERVICES_DIR = servicesDir
  if (writeDockerCompose)
    env.NFZ_WRITE_DOCKER_COMPOSE = '1'

  const plan = [
    { title: 'Patch nuxt.config.ts', details: [
      `feathers.servicesDirs = ['${servicesDir}']`,
      `feathers.database.mongo.url = ${mongodbUrl ? 'MONGODB_URL (.env)' : '(missing)'}`,
    ] },
    { title: 'Write .env', details: [
      `MONGODB_URL=${mongodbUrl || '(missing)'}`,
      `FIRST_USER=${firstUser} → ${localUsernameField}`,
      `FIRST_PASSWORD=${firstPassword ? '********' : '(missing)'} → ${localPasswordField}`,
    ] },
    { title: 'Generate users service', details: [
      `local auth fields: usernameField=${localUsernameField}, passwordField=${localPasswordField}`,
      `security: hashPassword('${localPasswordField}'), protect('${localPasswordField}')`,
    ] },
    { title: 'Write docker-compose.yaml', details: writeDockerCompose ? ['enabled'] : ['skipped'] },
  ]

  return { ok: true, preset: presetId, command, plan, env, masked: { FIRST_PASSWORD: '********' } }
}

export function assertPresetId(id: string): PresetId {
  if (isPresetId(id))
    return id
  throw new Error(`Unknown preset: ${id}`)
}
