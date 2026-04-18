import { createField, type BuilderServiceManifest } from '~~/shared/builder'

export type BuilderPresetId = 'mongoCrud' | 'mongoSecureCrud' | 'memoryCrud' | 'action'
export type BuilderStarterId = 'users' | 'articles' | 'jobs' | 'commands'

type BuilderPresetDefinition = {
  id: BuilderPresetId
  label: string
  title: string
  tone: 'primary' | 'secondary' | 'accent' | 'positive'
  icon: string
  copy: string
  hint: string
  bullets: string[]
  service: Partial<BuilderServiceManifest>
}

type BuilderStarterDefinition = {
  id: BuilderStarterId
  label: string
  title: string
  tone: 'primary' | 'secondary' | 'accent' | 'positive'
  icon: string
  copy: string
  presetId: BuilderPresetId
  bullets: string[]
  service: Partial<BuilderServiceManifest>
}

export const BUILDER_PRESET_CATALOG: BuilderPresetDefinition[] = [
  {
    id: 'mongoCrud',
    label: 'Mongo CRUD',
    title: 'Mongo CRUD',
    tone: 'primary',
    icon: 'dataset',
    copy: 'Le preset le plus proche du flux NFZ classique : collection MongoDB, preview multi-fichiers, hooks standards.',
    hint: 'find/get/create/patch/remove · auth OFF · hookPreset=standard',
    bullets: ['Adapter MongoDB', 'idField `_id`', 'title/status/publishedAt'],
    service: {
      adapter: 'mongodb',
      auth: false,
      docs: true,
      hookPreset: 'standard',
      schemaMode: 'zod',
      methods: ['find', 'get', 'create', 'patch', 'remove'],
      customMethods: [],
      idField: '_id',
      hooksFileMode: 'inline',
      barrelMode: 'none',
      fields: [
        createField({ name: 'title', type: 'string' }),
        createField({ name: 'status', type: 'string', required: false, defaultValue: 'draft' }),
        createField({ name: 'publishedAt', type: 'date', required: false }),
      ],
      notes: 'Preset Mongo CRUD aligné avec une collection NFZ standard.',
      customCode: `// preset mongoCrud
export const beforeCreate = async (context) => {
  return context
}
`,
    },
  },
  {
    id: 'mongoSecureCrud',
    label: 'Mongo auth',
    title: 'Mongo auth',
    tone: 'primary',
    icon: 'lock',
    copy: 'Même base CRUD MongoDB mais pensée pour les services protégés par auth JWT et policies futures.',
    hint: 'find/get/create/patch/remove · auth ON · hookPreset=standard',
    bullets: ['Auth activée', 'ownerId/visibility', 'base RBAC future'],
    service: {
      adapter: 'mongodb',
      auth: true,
      docs: true,
      hookPreset: 'standard',
      schemaMode: 'zod',
      methods: ['find', 'get', 'create', 'patch', 'remove'],
      customMethods: [],
      idField: '_id',
      hooksFileMode: 'separate',
      barrelMode: 'service',
      fields: [
        createField({ name: 'title', type: 'string' }),
        createField({ name: 'ownerId', type: 'string' }),
        createField({ name: 'visibility', type: 'string', required: false, defaultValue: 'private' }),
      ],
      notes: 'Preset Mongo sécurisé avec auth activée et champs compatibles policies futures.',
      customCode: `// preset mongoSecureCrud
export const beforeCreate = async (context) => {
  context.data = { ...context.data, createdBy: context.params?.user?.id || null }
  return context
}
`,
    },
  },
  {
    id: 'memoryCrud',
    label: 'Memory CRUD',
    title: 'Memory CRUD',
    tone: 'secondary',
    icon: 'memory',
    copy: 'Preset très rapide pour démontrer NFZ sans dépendance Mongo ni setup d’infrastructure.',
    hint: 'find/get/create/patch/remove · adapter=memory',
    bullets: ['Adapter memory', 'idField `id`', 'very fast demo'],
    service: {
      adapter: 'memory',
      auth: false,
      docs: true,
      hookPreset: 'standard',
      schemaMode: 'zod',
      methods: ['find', 'get', 'create', 'patch', 'remove'],
      customMethods: [],
      idField: 'id',
      hooksFileMode: 'inline',
      barrelMode: 'none',
      fields: [
        createField({ name: 'label', type: 'string' }),
        createField({ name: 'enabled', type: 'boolean', required: false, defaultValue: 'true' }),
      ],
      notes: 'Preset mémoire idéal pour montrer NFZ sans prérequis externe.',
      customCode: `// preset memoryCrud
export const beforeCreate = async (context) => {
  return context
}
`,
    },
  },
  {
    id: 'action',
    label: 'Action custom',
    title: 'Action custom',
    tone: 'accent',
    icon: 'bolt',
    copy: 'Pour les services métier orientés commande/méthodes custom avec hookPreset action.',
    hint: 'adapter=custom · méthodes pilotées · normalisation d’erreurs',
    bullets: ['Adapter custom', 'create/run/preview', 'payload + report'],
    service: {
      adapter: 'custom',
      auth: false,
      docs: true,
      hookPreset: 'action',
      schemaMode: 'zod',
      methods: ['create', 'run', 'preview'],
      customMethods: ['run', 'preview'],
      idField: 'id',
      hooksFileMode: 'separate',
      barrelMode: 'service',
      fields: [
        createField({ name: 'command', type: 'string' }),
        createField({ name: 'payload', type: 'object', required: false }),
        createField({ name: 'dryRun', type: 'boolean', required: false, defaultValue: 'true' }),
      ],
      notes: 'Preset orienté commande pour services métier non CRUD.',
      customCode: `// preset action
export const run = async (context) => {
  context.result = { ok: true, mode: 'run', data: context.data }
  return context
}

export const preview = async (context) => {
  context.result = { ok: true, mode: 'preview', data: context.params?.query || {} }
  return context
}
`,
    },
  },
]

export const BUILDER_STARTER_CATALOG: BuilderStarterDefinition[] = [
  {
    id: 'users',
    label: 'Users',
    title: 'Starter users',
    tone: 'primary',
    icon: 'group',
    copy: 'Variante métier pour un service users protégé, proche d’une base enterprise/local auth.',
    presetId: 'mongoSecureCrud',
    bullets: ['username/email/password', 'auth ON', 'hash password local', 'hooks séparés'],
    service: {
      name: 'users',
      path: 'users',
      collection: 'users',
      auth: true,
      hooksFileMode: 'separate',
      barrelMode: 'service+root',
      methods: ['find', 'get', 'create', 'patch', 'remove'],
      customMethods: [],
      fields: [
        createField({ name: 'username', type: 'string' }),
        createField({ name: 'email', type: 'string', required: false }),
        createField({ name: 'displayName', type: 'string', required: false }),
        createField({ name: 'password', type: 'string' }),
        createField({ name: 'roles', type: 'array', required: false }),
      ],
      notes: 'Starter users proche des conventions NFZ local auth : external resolver masque le mot de passe et data/patch resolver appliquent passwordHash.',
      customCode: `// starter users
export const beforeCreate = async (context) => {
  context.data = { ...context.data, roles: context.data?.roles || ['user'] }
  return context
}
`,
    },
  },
  {
    id: 'articles',
    label: 'Articles',
    title: 'Starter articles',
    tone: 'secondary',
    icon: 'article',
    copy: 'Variante métier éditoriale pour montrer un CRUD de contenu.',
    presetId: 'mongoCrud',
    bullets: ['title/slug/body', 'publishedAt', 'Mongo CRUD'],
    service: {
      name: 'articles',
      path: 'articles',
      collection: 'articles',
      hooksFileMode: 'separate',
      barrelMode: 'service',
      fields: [
        createField({ name: 'title', type: 'string' }),
        createField({ name: 'slug', type: 'string' }),
        createField({ name: 'excerpt', type: 'string', required: false }),
        createField({ name: 'body', type: 'string', required: false }),
        createField({ name: 'publishedAt', type: 'date', required: false }),
      ],
      notes: 'Starter éditorial pour démo CRUD et builder.',
    },
  },
  {
    id: 'jobs',
    label: 'Jobs',
    title: 'Starter jobs',
    tone: 'positive',
    icon: 'work_history',
    copy: 'Variante métier orientée traitements planifiés, avec état d’exécution.',
    presetId: 'mongoCrud',
    bullets: ['status/attempts/lastRunAt', 'Mongo', 'ops friendly'],
    service: {
      name: 'jobs',
      path: 'jobs',
      collection: 'jobs',
      hooksFileMode: 'separate',
      barrelMode: 'service',
      fields: [
        createField({ name: 'name', type: 'string' }),
        createField({ name: 'status', type: 'string', required: false, defaultValue: 'pending' }),
        createField({ name: 'attempts', type: 'number', required: false, defaultValue: '0' }),
        createField({ name: 'lastRunAt', type: 'date', required: false }),
      ],
      notes: 'Starter jobs pour scénarios backoffice/ops.',
    },
  },
  {
    id: 'commands',
    label: 'Commands',
    title: 'Starter commands',
    tone: 'accent',
    icon: 'terminal',
    copy: 'Variante métier orientée orchestration/commande avec méthodes custom.',
    presetId: 'action',
    bullets: ['command/target/payload', 'run + preview', 'hooks séparés'],
    service: {
      name: 'commands',
      path: 'commands',
      collection: 'commands',
      hooksFileMode: 'separate',
      barrelMode: 'service',
      methods: ['create', 'run', 'preview'],
      customMethods: ['run', 'preview'],
      fields: [
        createField({ name: 'command', type: 'string' }),
        createField({ name: 'target', type: 'string', required: false }),
        createField({ name: 'payload', type: 'object', required: false }),
        createField({ name: 'dryRun', type: 'boolean', required: false, defaultValue: 'true' }),
      ],
      notes: 'Starter commands pour méthodes custom pilotées.',
    },
  },
]

export function getBuilderPresetDefinition(id: BuilderPresetId) {
  return BUILDER_PRESET_CATALOG.find(item => item.id === id) || null
}

export function getBuilderStarterDefinition(id: BuilderStarterId) {
  return BUILDER_STARTER_CATALOG.find(item => item.id === id) || null
}

export function getPresetCount() {
  return BUILDER_PRESET_CATALOG.length
}

export function getStarterCount() {
  return BUILDER_STARTER_CATALOG.length
}

export function applyBuilderPreset(service: BuilderServiceManifest, presetId: BuilderPresetId): BuilderServiceManifest {
  const preset = getBuilderPresetDefinition(presetId)
  if (!preset) return service
  const methods = [...new Set((preset.service.methods || service.methods || []).map(method => String(method).trim()).filter(Boolean))]
  const customMethods = [...new Set((preset.service.customMethods || methods.filter(method => !['find', 'get', 'create', 'update', 'patch', 'remove'].includes(method))).map(method => String(method).trim()).filter(Boolean))]

  return {
    ...service,
    adapter: preset.service.adapter || service.adapter,
    auth: preset.service.auth ?? service.auth,
    docs: preset.service.docs ?? service.docs,
    hookPreset: preset.service.hookPreset || service.hookPreset,
    schemaMode: preset.service.schemaMode || service.schemaMode,
    methods,
    customMethods,
    idField: preset.service.idField || (preset.service.adapter === 'mongodb' ? '_id' : service.idField || 'id'),
    hooksFileMode: preset.service.hooksFileMode || service.hooksFileMode || 'inline',
    barrelMode: preset.service.barrelMode || service.barrelMode || 'none',
    fields: (preset.service.fields || service.fields || []).map(field => createField(field)),
    customCode: preset.service.customCode || service.customCode,
    notes: preset.service.notes || service.notes,
    starterId: '',
    updatedAt: new Date().toISOString(),
  }
}

export function applyBuilderStarter(service: BuilderServiceManifest, starterId: BuilderStarterId): BuilderServiceManifest {
  const starter = getBuilderStarterDefinition(starterId)
  if (!starter) return service
  const seeded = applyBuilderPreset(service, starter.presetId)
  return {
    ...seeded,
    name: starter.service.name || seeded.name,
    path: starter.service.path || seeded.path,
    collection: starter.service.collection || starter.service.path || seeded.collection,
    adapter: starter.service.adapter || seeded.adapter,
    auth: starter.service.auth ?? seeded.auth,
    docs: starter.service.docs ?? seeded.docs,
    hookPreset: starter.service.hookPreset || seeded.hookPreset,
    schemaMode: starter.service.schemaMode || seeded.schemaMode,
    methods: [...new Set((starter.service.methods || seeded.methods || []).map(method => String(method).trim()).filter(Boolean))],
    customMethods: [...new Set((starter.service.customMethods || seeded.customMethods || []).map(method => String(method).trim()).filter(Boolean))],
    idField: starter.service.idField || seeded.idField,
    hooksFileMode: starter.service.hooksFileMode || seeded.hooksFileMode || 'inline',
    barrelMode: starter.service.barrelMode || seeded.barrelMode || 'none',
    fields: (starter.service.fields || seeded.fields || []).map(field => createField(field)),
    customCode: starter.service.customCode || seeded.customCode,
    notes: starter.service.notes || seeded.notes,
    starterId,
    updatedAt: new Date().toISOString(),
  }
}
