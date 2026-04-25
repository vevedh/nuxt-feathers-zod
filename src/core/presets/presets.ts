import type { PresetDefinition, PresetId } from './types'

const PRESETS: PresetDefinition[] = [
  {
    id: 'mongo+local-auth+users+seed',
    title: 'MongoDB + Local Auth + Users + Seed',
    description: 'Initialise un projet Nuxt 4 avec MongoDB, auth locale et service users (userId/password) + seed FIRST_USER/FIRST_PASSWORD.',
    cliPreset: 'mongo-local-auth-users-seed',
    fields: [
      {
        key: 'servicesDir',
        label: 'Services dir',
        type: 'string',
        default: 'services',
        required: true,
        placeholder: 'services',
        help: 'Répertoire scanné par nuxt-feathers-zod (feathers.servicesDirs).',
      },
      {
        key: 'mongodbUrl',
        label: 'MongoDB URL',
        type: 'string',
        required: true,
        placeholder: 'mongodb://user:pass@localhost:27017/db?authSource=admin',
        help: 'Injecté dans .env (MONGODB_URL) et dans nuxt.config.ts.',
      },
      {
        key: 'localUsernameField',
        label: 'Local usernameField (users)',
        type: 'select',
        default: 'userId',
        options: [
          { label: 'userId (default)', value: 'userId' },
          { label: 'email', value: 'email' },
        ],
        help: 'Uniquement pour le service users (auth locale).',
      },
      {
        key: 'localPasswordField',
        label: 'Local passwordField (users)',
        type: 'string',
        default: 'password',
        required: true,
        placeholder: 'password',
        help: 'Le générateur applique hashPassword/protect sur ce champ.',
      },
      {
        key: 'firstUser',
        label: 'FIRST_USER',
        type: 'string',
        default: 'admin',
        required: true,
        placeholder: 'admin',
        help: 'Seed: correspond à usernameField (ex: userId).',
      },
      {
        key: 'firstPassword',
        label: 'FIRST_PASSWORD',
        type: 'password',
        default: 'changeme',
        required: true,
        placeholder: '********',
        help: 'Mot de passe initial (seed).',
      },
      {
        key: 'writeDockerCompose',
        label: 'Write docker-compose.yaml',
        type: 'boolean',
        default: false,
        help: 'Génère un docker-compose.yaml (MongoDB) si activé.',
      },
      {
        key: 'force',
        label: 'Force',
        type: 'boolean',
        default: true,
        help: 'Écrase les fichiers existants si nécessaire.',
      },
    ],
  },
]

export function listPresets() {
  return PRESETS
}

export function getPreset(id: string): PresetDefinition | null {
  return PRESETS.find(p => p.id === id) ?? null
}

export function isPresetId(id: string): id is PresetId {
  return id === 'mongo+local-auth+users+seed'
}
