export type LicenseFeatureCategory = 'core' | 'builder' | 'diagnostics' | 'admin' | 'integrations' | 'branding'
export type LicenseFeatureState = 'enabled' | 'disabled' | 'locked'

export type LicenseFeatureDescriptor = {
  key: string
  title: string
  description: string
  category: LicenseFeatureCategory
  runtimeFlag?: string
  route?: string
  premium?: boolean
}

export const LICENSE_FEATURES: LicenseFeatureDescriptor[] = [
  {
    key: 'builder',
    title: 'Builder Studio',
    description: 'Workspace visuel, presets, starters métier et génération de services.',
    category: 'builder',
    runtimeFlag: 'builderEnabled',
    route: '/services-manager',
  },
  {
    key: 'builder-advanced',
    title: 'Builder avancé',
    description: 'Apply multi-fichiers, barrels, hooks séparés et presets enrichis.',
    category: 'builder',
    runtimeFlag: 'builderAdvancedEnabled',
    route: '/builder-demo',
    premium: true,
  },
  {
    key: 'diagnostics',
    title: 'Diagnostics',
    description: 'Timeline, résumé runtime, inspection des traces et état produit.',
    category: 'diagnostics',
    runtimeFlag: 'diagnosticsEnabled',
    route: '/diagnostics',
  },
  {
    key: 'diagnostics-export',
    title: 'Export diagnostics',
    description: 'Export JSON et partage des traces runtime.',
    category: 'diagnostics',
    runtimeFlag: 'diagnosticsExportEnabled',
    route: '/diagnostics',
    premium: true,
  },
  {
    key: 'mongo-admin',
    title: 'Mongo Admin',
    description: 'Exploration et opérations d’administration MongoDB dans le dashboard.',
    category: 'admin',
    runtimeFlag: 'mongoAdminEnabled',
    route: '/mongo-mgmt',
  },
  {
    key: 'mongo-dangerous',
    title: 'Mongo actions destructives',
    description: 'Create/drop DB/collections et opérations documents destructives.',
    category: 'admin',
    runtimeFlag: 'mongoAdminDangerous',
    route: '/mongo-mgmt',
    premium: true,
  },
  {
    key: 'auth-demo',
    title: 'Auth demo',
    description: 'Parcours login/logout/reAuthenticate et inspection de session.',
    category: 'core',
    runtimeFlag: 'authDemoEnabled',
    route: '/auth-demo',
  },
  {
    key: 'crud-demo',
    title: 'CRUD demo',
    description: 'Démonstration create/list/patch/remove sur un service Feathers.',
    category: 'core',
    runtimeFlag: 'crudDemoEnabled',
    route: '/crud-demo',
  },
  {
    key: 'license-center',
    title: 'License Center',
    description: 'Pilotage des licences, features et états runtime du produit.',
    category: 'core',
    runtimeFlag: 'licenseCenterEnabled',
    route: '/license-center',
  },
  {
    key: 'adcs',
    title: 'ADCS integration',
    description: 'Intégration ADCS pour demandes/exports de certificats.',
    category: 'integrations',
    runtimeFlag: 'adcsEnabled',
    route: '/certificats',
    premium: true,
  },
  {
    key: 'multi-workspace',
    title: 'Multi-workspace',
    description: 'Plusieurs workspaces projet et variations d’exports du builder.',
    category: 'integrations',
    runtimeFlag: 'multiWorkspaceEnabled',
    premium: true,
  },
  {
    key: 'branding',
    title: 'Branding',
    description: 'Personnalisation de l’habillage, du branding et des surfaces produit.',
    category: 'branding',
    runtimeFlag: 'brandingEnabled',
    premium: true,
  },
]

export const LICENSE_PLANS = [
  {
    key: 'community',
    title: 'Community',
    copy: 'Découverte locale, démos et administration de base.',
    features: ['builder', 'diagnostics', 'auth-demo', 'crud-demo', 'license-center'],
  },
  {
    key: 'studio',
    title: 'Studio',
    copy: 'Builder avancé, exports diagnostics et presets premium.',
    features: ['builder', 'builder-advanced', 'diagnostics', 'diagnostics-export', 'mongo-admin', 'auth-demo', 'crud-demo', 'license-center'],
  },
  {
    key: 'pro',
    title: 'Pro',
    copy: 'Administration étendue, workspaces et branding.',
    features: ['builder', 'builder-advanced', 'diagnostics', 'diagnostics-export', 'mongo-admin', 'mongo-dangerous', 'auth-demo', 'crud-demo', 'license-center', 'multi-workspace', 'branding'],
  },
  {
    key: 'enterprise',
    title: 'Enterprise',
    copy: 'Intégrations et gouvernance complètes.',
    features: ['builder', 'builder-advanced', 'diagnostics', 'diagnostics-export', 'mongo-admin', 'mongo-dangerous', 'auth-demo', 'crud-demo', 'license-center', 'multi-workspace', 'branding', 'adcs'],
  },
] as const

export function groupFeaturesByCategory() {
  return LICENSE_FEATURES.reduce((acc, feature) => {
    ;(acc[feature.category] ||= []).push(feature)
    return acc
  }, {} as Record<LicenseFeatureCategory, LicenseFeatureDescriptor[]>)
}
