import { LICENSE_PLANS } from './license-features'

export type NfzStudioEdition = 'community' | 'studio' | 'pro' | 'enterprise'

export type StudioEditionDescriptor = {
  key: NfzStudioEdition
  title: string
  tagline: string
  copy: string
  seats: number
  supportLevel: 'community' | 'standard' | 'priority' | 'enterprise'
  features: string[]
  premium: boolean
  accent: string
  focus: string[]
}

export const STUDIO_EDITIONS: StudioEditionDescriptor[] = [
  {
    key: 'community',
    title: 'NFZ Studio Community',
    tagline: 'Découverte locale',
    copy: 'Socle gratuit pour découvrir NFZ Studio, valider le runtime et tester les parcours essentiels.',
    seats: 1,
    supportLevel: 'community',
    features: [...LICENSE_PLANS.find(plan => plan.key === 'community')!.features],
    premium: false,
    accent: 'positive',
    focus: ['builder essentiel', 'diagnostics de base', 'démos auth / crud'],
  },
  {
    key: 'studio',
    title: 'NFZ Studio',
    tagline: 'Builder premium',
    copy: 'Edition équipe réduite avec builder avancé, diagnostics exportables et Mongo admin lisible.',
    seats: 5,
    supportLevel: 'standard',
    features: [...LICENSE_PLANS.find(plan => plan.key === 'studio')!.features],
    premium: true,
    accent: 'primary',
    focus: ['builder avancé', 'exports diagnostics', 'Mongo admin'],
  },
  {
    key: 'pro',
    title: 'NFZ Studio Pro',
    tagline: 'Ops avancées',
    copy: 'Administration étendue, workspaces, branding et outils avancés pour les équipes exploitation.',
    seats: 25,
    supportLevel: 'priority',
    features: [...LICENSE_PLANS.find(plan => plan.key === 'pro')!.features],
    premium: true,
    accent: 'secondary',
    focus: ['mongo dangereux', 'multi-workspace', 'branding'],
  },
  {
    key: 'enterprise',
    title: 'NFZ Studio Enterprise',
    tagline: 'Gouvernance complète',
    copy: 'Edition la plus complète pour SSO, intégrations sensibles, gouvernance et besoins entreprise.',
    seats: 250,
    supportLevel: 'enterprise',
    features: [...LICENSE_PLANS.find(plan => plan.key === 'enterprise')!.features],
    premium: true,
    accent: 'deep-purple',
    focus: ['ADCS', 'branding avancé', 'préparation enterprise'],
  },
]

export const STUDIO_ROUTE_FEATURES: Record<string, string> = {
  '/services-manager': 'builder',
  '/builder-demo': 'builder-advanced',
  '/diagnostics': 'diagnostics',
  '/license-center': 'license-center',
  '/mongo-mgmt': 'mongo-admin',
  '/auth-demo': 'auth-demo',
  '/crud-demo': 'crud-demo',
  '/certificats': 'adcs',
}

export function normalizeEditionKey(value?: string | null): NfzStudioEdition {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'community'
  if (raw.includes('enterprise')) return 'enterprise'
  if (raw === 'pro' || raw.includes('-pro') || raw.includes(' pro')) return 'pro'
  if (raw === 'studio' || raw.includes('docker-studio') || raw.includes(' studio')) return 'studio'
  if (raw === 'community' || raw.includes('docker-community') || raw.includes(' community')) return 'community'
  return LICENSE_PLANS.some(plan => plan.key === raw) ? raw as NfzStudioEdition : 'community'
}

export function getStudioEditionDescriptor(value?: string | null) {
  const key = normalizeEditionKey(value)
  return STUDIO_EDITIONS.find(item => item.key === key) || STUDIO_EDITIONS[0]
}

export function getRequiredFeatureForRoute(path?: string | null) {
  const routePath = String(path || '').trim()
  if (!routePath) return null
  const matched = Object.keys(STUDIO_ROUTE_FEATURES)
    .sort((a, b) => b.length - a.length)
    .find(prefix => routePath === prefix || routePath.startsWith(`${prefix}/`))
  return matched ? STUDIO_ROUTE_FEATURES[matched] : null
}
