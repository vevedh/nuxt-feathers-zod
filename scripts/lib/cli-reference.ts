import type { CommandDef } from 'citty'

export interface NfzCliArgumentReference {
  name: string
  type: string
  required: boolean
  alias?: string
  options: string[]
  description: string
}

export interface NfzCliCommandReference {
  path: string
  description: string
  arguments: NfzCliArgumentReference[]
}

function normalizeDescription(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function collectCliCommandReference(root: CommandDef): NfzCliCommandReference[] {
  const output: NfzCliCommandReference[] = []

  function visit(command: CommandDef, segments: string[]): void {
    const subCommands = command.subCommands ?? {}
    const entries = Object.entries(subCommands)
    if (entries.length) {
      for (const [name, subCommand] of entries)
        visit(subCommand, [...segments, name])
      return
    }

    if (!segments.length)
      return

    const args = Object.entries(command.args ?? {}).map(([name, definition]) => {
      const argument = definition as {
        alias?: string
        description?: string
        options?: readonly unknown[]
        required?: boolean
        type?: string
      }
      return {
        name,
        type: String(argument.type || 'string'),
        required: Boolean(argument.required),
        alias: typeof argument.alias === 'string' ? argument.alias : undefined,
        options: Array.isArray(argument.options) ? argument.options.map(String) : [],
        description: normalizeDescription(argument.description),
      }
    })

    output.push({
      path: segments.join(' '),
      description: normalizeDescription((command.meta as { description?: unknown } | undefined)?.description),
      arguments: args,
    })
  }

  visit(root, [])
  return output.sort((left, right) => left.path.localeCompare(right.path, 'en'))
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function renderArgument(argument: NfzCliArgumentReference): string {
  if (argument.type === 'positional')
    return argument.required ? `<${argument.name}>` : `[${argument.name}]`

  const value = argument.type === 'boolean'
    ? ''
    : argument.options.length
      ? ` <${argument.options.join('|')}>`
      : ' <value>'
  const required = argument.required ? ' *' : ''
  const alias = argument.alias ? `, --${argument.alias}` : ''
  return `--${argument.name}${alias}${value}${required}`
}

const frCommandNotes: Record<string, string> = {
  capabilities: 'Expose la matrice des capacités réellement implémentées par la version installée.',
  doctor: 'Analyse le projet courant et signale les incohérences de configuration ou de services.',
  'init embedded': 'Configure Nuxt avec un serveur Feathers embarqué dans Nitro.',
  'init remote': 'Configure le client Nuxt pour une API Feathers distante.',
  'init starter': 'Copie le starter Nuxt 4 + Quasar 2 + UnoCSS + Pinia livré avec le package.',
  'init templates': 'Installe les templates modifiables du module.',
  'remote auth keycloak': 'Configure le mode client Keycloak pour un backend distant.',
  'add service': 'Génère un service Feathers avec adapter memory ou MongoDB, ou un service personnalisé.',
  'add custom-service': 'Alias explicite pour générer un service personnalisé sans adapter standard.',
  'add file-service': 'Génère un service local de dépôt et téléchargement de fichiers.',
  'add remote-service': 'Déclare un service Feathers distant dans la configuration client.',
  'add middleware': 'Génère un middleware ou un artefact serveur ciblé.',
  'add server-module': 'Génère un module serveur Feathers/Nitro à partir d’un preset.',
  'add mongodb-compose': 'Génère un fichier Compose MongoDB de développement.',
  'mongo management': 'Configure les services d’administration MongoDB exposés par le module.',
  schema: 'Inspecte, valide et modifie le manifeste de schéma d’un service.',
  'auth service': 'Active ou désactive les hooks JWT sur un service existant.',
  'templates list': 'Liste les templates disponibles.',
  'templates init': 'Installe les templates dans le projet.',
  'plugins list': 'Liste les plugins serveur détectés.',
  'plugins add': 'Génère un plugin serveur Feathers.',
  'modules list': 'Liste les modules serveur détectés.',
  'modules add': 'Génère un module serveur.',
  'middlewares list': 'Liste les middlewares et artefacts ciblés.',
  'middlewares add': 'Génère un middleware à partir du registre de presets.',
}

const enCommandNotes: Record<string, string> = {
  capabilities: 'Expose the capability matrix implemented by the installed package version.',
  doctor: 'Inspect the current project and report configuration or service inconsistencies.',
  'init embedded': 'Configure Nuxt with a Feathers server embedded in Nitro.',
  'init remote': 'Configure the Nuxt client for a remote Feathers API.',
  'init starter': 'Copy the Nuxt 4 + Quasar 2 + UnoCSS + Pinia starter shipped with the package.',
  'init templates': 'Install customizable module templates.',
  'remote auth keycloak': 'Configure Keycloak client mode for a remote backend.',
  'add service': 'Generate a Feathers service using memory, MongoDB, or a custom service class.',
  'add custom-service': 'Explicit alias for a custom service without a standard adapter.',
  'add file-service': 'Generate a local upload and download service.',
  'add remote-service': 'Declare a remote Feathers service in the client configuration.',
  'add middleware': 'Generate middleware or another targeted server artifact.',
  'add server-module': 'Generate a Feathers/Nitro server module from a preset.',
  'add mongodb-compose': 'Generate a development MongoDB Compose file.',
  'mongo management': 'Configure MongoDB management services exposed by the module.',
  schema: 'Inspect, validate, and modify a service schema manifest.',
  'auth service': 'Enable or disable JWT hooks on an existing service.',
  'templates list': 'List available templates.',
  'templates init': 'Install templates into the project.',
  'plugins list': 'List detected server plugins.',
  'plugins add': 'Generate a Feathers server plugin.',
  'modules list': 'List detected server modules.',
  'modules add': 'Generate a server module.',
  'middlewares list': 'List middleware and targeted artifacts.',
  'middlewares add': 'Generate middleware from the preset registry.',
}

export function renderCliReference(commands: NfzCliCommandReference[], locale: 'fr' | 'en', version: string): string {
  const isFr = locale === 'fr'
  const title = isFr ? 'Référence CLI' : 'CLI reference'
  const lead = isFr
    ? 'Cette page est générée depuis l’arbre de commandes réellement exporté par la CLI. Les commandes et options ci-dessous correspondent donc à la version publiée du module.'
    : 'This page is generated from the command tree exported by the CLI. The commands and options below therefore match the published module version.'
  const notes = isFr ? frCommandNotes : enCommandNotes
  const lines = [
    `# ${title}`,
    '',
    lead,
    '',
    '```bash',
    'bunx nuxt-feathers-zod --help',
    'bunx nuxt-feathers-zod capabilities --section all --json',
    '```',
    '',
    isFr ? '## Principes d’utilisation' : '## Usage principles',
    '',
    ...(isFr
      ? [
          '- Exécutez `doctor` après une génération ou une modification importante de `nuxt.config.ts`.',
          '- Utilisez `--dry` lorsqu’il est disponible pour vérifier un patch avant écriture.',
          '- Utilisez `--force` uniquement lorsque vous acceptez de remplacer un artefact existant.',
          '- Pour un service métier, préférez `add service` ou `add custom-service` à une création manuelle de dossiers.',
          '- Le format des champs de `schema --add-field` est `nom:type!` pour un champ requis, par exemple `title:string!`.',
        ]
      : [
          '- Run `doctor` after generation or a significant `nuxt.config.ts` change.',
          '- Use `--dry` when available to inspect a patch before writing files.',
          '- Use `--force` only when replacing an existing artifact is intentional.',
          '- For business services, prefer `add service` or `add custom-service` over manually creating folders.',
          '- The `schema --add-field` field format is `name:type!` for a required field, for example `title:string!`.',
        ]),
    '',
    isFr ? '## Catalogue des commandes' : '## Command catalogue',
    '',
    isFr
      ? '| Commande | Rôle | Arguments et options |'
      : '| Command | Purpose | Arguments and options |',
    '|---|---|---|',
  ]

  for (const command of commands) {
    const argumentsText = command.arguments.length
      ? command.arguments.map(argument => `\`${renderArgument(argument)}\``).join('<br>')
      : '—'
    const purpose = notes[command.path] || command.description || '—'
    lines.push(`| \`${escapeCell(command.path)}\` | ${escapeCell(purpose)} | ${argumentsText} |`)
  }

  lines.push(
    '',
    isFr ? '## Parcours recommandés' : '## Recommended workflows',
    '',
    isFr ? '### Backend Feathers embarqué' : '### Embedded Feathers backend',
    '',
    '```bash',
    'bunx nuxt-feathers-zod init embedded --auth --framework express',
    'bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --auth',
    'bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod',
    'bunx nuxt-feathers-zod schema articles --add-field title:string!',
    'bunx nuxt-feathers-zod doctor',
    '```',
    '',
    isFr ? '### Service personnalisé' : '### Custom service',
    '',
    '```bash',
    'bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod',
    '```',
    '',
    isFr ? '### Client distant' : '### Remote client',
    '',
    '```bash',
    'bunx nuxt-feathers-zod init remote --url https://api.example.test --transport socketio --auth',
    'bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove',
    'bunx nuxt-feathers-zod doctor',
    '```',
    '',
    isFr ? '## Source de vérité' : '## Source of truth',
    '',
    isFr
      ? 'La commande `capabilities --json` expose les modes, transports, services NFZ, composables et événements d’authentification implémentés. Le contrôle de cohérence du dépôt compare cette matrice au runtime, au playground et à la documentation.'
      : 'The `capabilities --json` command exposes implemented modes, transports, NFZ services, composables, and authentication events. The repository coherence gate compares this matrix with the runtime, playground, and documentation.',
    '',
    `<!-- release-version: ${version} -->`,
    '',
  )

  return lines.join('\n')
}
