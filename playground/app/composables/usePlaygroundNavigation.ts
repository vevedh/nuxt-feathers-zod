export interface PlaygroundNavItem {
  label: string
  description: string
  to: string
  icon: string
  level: 'essential' | 'advanced' | 'diagnostic'
}

export interface PlaygroundNavGroup {
  label: string
  items: PlaygroundNavItem[]
}

const groups: PlaygroundNavGroup[] = [
  {
    label: 'Parcours principal',
    items: [
      { label: 'Tableau de bord', description: 'État général et contrôles rapides', to: '/', icon: '⌂', level: 'essential' },
      { label: 'Tests essentiels', description: 'Connexion, services et authentification', to: '/tests', icon: '✓', level: 'essential' },
      { label: 'Scénarios', description: 'Matrice embedded, REST, Socket.IO et SSO', to: '/validation', icon: '▦', level: 'essential' },
    ],
  },
  {
    label: 'Fonctions métier',
    items: [
      { label: 'Messages', description: 'CRUD Feathers protégé', to: '/messages', icon: '✉', level: 'essential' },
      { label: 'Actions', description: 'Méthode personnalisée actions.run()', to: '/actions', icon: '▶', level: 'essential' },
      { label: 'MongoDB', description: 'Administration et diagnostic MongoDB', to: '/mongo', icon: '◆', level: 'essential' },
      { label: 'Validation Zod', description: 'Schémas et générateur de service', to: '/builder', icon: '◇', level: 'advanced' },
    ],
  },
  {
    label: 'Runtime et transports',
    items: [
      { label: 'Authentification', description: 'Runtime, événements et bridge Keycloak', to: '/auth-runtime', icon: '◎', level: 'advanced' },
      { label: 'Mode embedded', description: 'Backend intégré et services locaux', to: '/embedded', icon: '◉', level: 'advanced' },
      { label: 'REST distant', description: 'Diagnostic HTTP brut et client Feathers', to: '/remote/rest', icon: '⇄', level: 'advanced' },
      { label: 'Socket.IO distant', description: 'Transport temps réel et reconnexion', to: '/remote/socketio', icon: '↯', level: 'advanced' },
      { label: 'Middleware serveur', description: 'Ordre modules, plugins et services', to: '/middleware', icon: '≋', level: 'diagnostic' },
    ],
  },
  {
    label: 'Outils avancés',
    items: [
      { label: 'Service distant', description: 'Exemple ldapusers', to: '/ldapusers', icon: '↗', level: 'diagnostic' },
      { label: 'Service mongos', description: 'Lecture Pinia/Feathers directe', to: '/mongos', icon: '◫', level: 'diagnostic' },
      { label: 'Console Builder', description: 'Console de génération NFZ', to: '/console/builder', icon: '⌘', level: 'diagnostic' },
      { label: 'Console RBAC', description: 'Rôles et capacités', to: '/console/rbac', icon: '⚿', level: 'diagnostic' },
    ],
  },
]

export function usePlaygroundNavigation() {
  const route = useRoute()

  const isActive = (to: string) => {
    if (to === '/') return route.path === '/'
    return route.path === to || route.path.startsWith(`${to}/`)
  }

  const essentialItems = computed(() => groups.flatMap(group => group.items).filter(item => item.level === 'essential'))
  const advancedItems = computed(() => groups.flatMap(group => group.items).filter(item => item.level === 'advanced'))

  return {
    groups,
    essentialItems,
    advancedItems,
    isActive,
  }
}
