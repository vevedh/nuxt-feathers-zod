import { getStudioEditionDescriptor, type NfzStudioEdition } from './studio-editions'

export type StudioScenarioProvider = 'manual' | 'stripe' | 'paypal'

export type StudioTestScenario = {
  key: NfzStudioEdition
  edition: NfzStudioEdition
  title: string
  summary: string
  provider: StudioScenarioProvider
  customer: {
    email: string
    name: string
    company: string
  }
  nfzStudio: {
    variantName: string
    targetUseCase: string
  }
  notes: string[]
}

export const NFZ_STUDIO_TEST_SCENARIOS: StudioTestScenario[] = [
  {
    key: 'community',
    edition: 'community',
    title: 'NFZ Studio Community',
    summary: 'Fixture minimale pour découvrir NFZ Studio et valider le socle runtime.',
    provider: 'manual',
    customer: {
      email: 'community@nfz.studio.local',
      name: 'NFZ Studio Community Test',
      company: 'NFZ Community Lab',
    },
    nfzStudio: {
      variantName: 'Community',
      targetUseCase: 'Découverte locale, documentation et smoke tests.',
    },
    notes: ['Base gratuite', 'Feature gating minimum', 'Aucune option premium'],
  },
  {
    key: 'studio',
    edition: 'studio',
    title: 'NFZ Studio',
    summary: 'Fixture équipe réduite pour builder premium, diagnostics et Mongo admin.',
    provider: 'stripe',
    customer: {
      email: 'studio@nfz.studio.local',
      name: 'NFZ Studio Standard Test',
      company: 'NFZ Studio Team',
    },
    nfzStudio: {
      variantName: 'Studio',
      targetUseCase: 'Builder avancé, diagnostics exportables et usage équipe compacte.',
    },
    notes: ['Provider Stripe simulé', 'Builder premium actif', 'Mongo admin disponible'],
  },
  {
    key: 'pro',
    edition: 'pro',
    title: 'NFZ Studio Pro',
    summary: 'Fixture exploitation avancée avec outils premium et branding.',
    provider: 'paypal',
    customer: {
      email: 'pro@nfz.studio.local',
      name: 'NFZ Studio Pro Test',
      company: 'NFZ Pro Ops',
    },
    nfzStudio: {
      variantName: 'Pro',
      targetUseCase: 'Ops avancées, multi-workspace et branding.',
    },
    notes: ['Provider PayPal simulé', 'Mongo dangereux activable', 'Branding inclus'],
  },
  {
    key: 'enterprise',
    edition: 'enterprise',
    title: 'NFZ Studio Enterprise',
    summary: 'Fixture gouvernance complète pour scénarios entreprise et intégrations sensibles.',
    provider: 'manual',
    customer: {
      email: 'enterprise@nfz.studio.local',
      name: 'NFZ Studio Enterprise Test',
      company: 'NFZ Enterprise Labs',
    },
    nfzStudio: {
      variantName: 'Enterprise',
      targetUseCase: 'Support entreprise, ADCS, branding et trajectoire SSO.',
    },
    notes: ['Provider manuel', 'Edition la plus complète', 'Préparation aux scénarios enterprise'],
  },
]

export function getStudioTestScenario(edition: NfzStudioEdition) {
  const found = NFZ_STUDIO_TEST_SCENARIOS.find(item => item.edition === edition)
  if (!found) throw new Error(`Unknown studio test scenario: ${edition}`)
  return found
}

export function buildStudioScenarioLicense(edition: NfzStudioEdition) {
  const scenario = getStudioTestScenario(edition)
  const descriptor = getStudioEditionDescriptor(edition)
  return {
    key: `nfz-studio-${edition}-local`,
    customer: scenario.customer.email,
    plan: descriptor.key,
    edition: descriptor.key,
    features: descriptor.features,
    metadata: {
      scenario: scenario.key,
      provider: scenario.provider,
      variantName: scenario.nfzStudio.variantName,
      targetUseCase: scenario.nfzStudio.targetUseCase,
      company: scenario.customer.company,
      notes: scenario.notes,
    },
  }
}
