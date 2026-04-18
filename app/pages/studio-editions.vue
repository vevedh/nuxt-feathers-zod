<script setup lang="ts">
import DashboardSectionCard from '../components/dashboard/kit/DashboardSectionCard.vue'
import DashboardContextBar from '../components/dashboard/kit/DashboardContextBar.vue'
import DashboardInspectorPanel from '../components/dashboard/kit/DashboardInspectorPanel.vue'
import DashboardToolbar from '../components/dashboard/kit/DashboardToolbar.vue'
import LicenseFeatureGrid from '../components/dashboard/license/LicenseFeatureGrid.vue'
import LicensePlanCompare from '../components/dashboard/license/LicensePlanCompare.vue'
import FeatureGatePanel from '../components/dashboard/license/FeatureGatePanel.vue'
import type { DashboardContextItem } from '../components/dashboard/kit/DashboardContextBar.vue'
import type { NfzStudioEdition } from '../utils/studio-editions'

const route = useRoute()
const q = useQuasar()
const activeTab = ref<'edition' | 'scenarios' | 'matrix'>('edition')
const blockedFeature = computed(() => String(route.query.blocked || ''))
const fromRoute = computed(() => String(route.query.from || ''))
const { state, pending, refresh, applyScenario } = useStudioEdition()
await refresh()

const context = computed(() => state.value || {})
const edition = computed(() => context.value.edition || {})
const runtime = computed(() => context.value.runtime || {})
const license = computed(() => context.value.license || {})
const featureMatrix = computed(() => context.value.featureMatrix || { items: [], plans: [] })
const scenarios = computed(() => context.value.scenarios || [])
const quickLinks = computed(() => context.value.quickLinks || [])
const editions = computed(() => context.value.editions || [])

const enabledFeatureCount = computed(() => (featureMatrix.value.items || []).filter((item: any) => item.state === 'enabled').length)
const lockedQuickLinkCount = computed(() => (quickLinks.value || []).filter((item: any) => !item.allowed).length)

const contextItems = computed<DashboardContextItem[]>(() => [
  { label: 'Edition', value: String(edition.value.title || 'n/a'), icon: 'workspace_premium', tone: 'primary' },
  { label: 'Plan', value: String(license.value.plan || runtime.value.plan || 'n/a'), icon: 'mdi-label-outline', tone: 'secondary' },
  { label: 'Features actives', value: String(enabledFeatureCount.value || 0), icon: 'fact_check', tone: 'positive' },
  { label: 'Support', value: String(edition.value.supportLevel || 'community'), icon: 'support_agent', tone: 'info' },
])

const applying = ref<string | null>(null)
async function handleApplyScenario(editionKey: NfzStudioEdition) {
  applying.value = editionKey
  try {
    await applyScenario(editionKey)
    q.notify({ type: 'positive', message: `Scénario ${editionKey} appliqué localement.` })
  }
  catch (error: any) {
    q.notify({ type: 'negative', message: error?.message || 'Application impossible.' })
  }
  finally {
    applying.value = null
  }
}
</script>

<template>
  <QPage class="dash-page">
    <DashboardSectionCard
      kicker="NFZ Studio"
      title="Studio Editions"
      copy="Pilote localement les 4 éditions NFZ Studio et vérifie immédiatement le feature gating de l’application consommateur."
      dense
    >
      <div class="grid gap-5">
        <QBanner v-if="blockedFeature" rounded class="bg-[var(--nfz-primary-soft)] text-sm">
          <div class="font-medium">Fonction verrouillée : {{ blockedFeature }}</div>
          <div class="mt-1">La route <strong>{{ fromRoute || 'demandée' }}</strong> n’est pas incluse dans l’édition courante. Change de scénario ou applique une licence adaptée.</div>
        </QBanner>

        <DashboardContextBar :items="contextItems" />

        <QCard flat bordered class="dash-panel overflow-hidden">
          <QCardSection class="p-4 md:p-5 pb-3">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="dash-kicker">Workspace</div>
                <div class="mt-1 text-lg font-semibold nfz-title">Edition-aware runtime</div>
                <div class="mt-1 text-sm nfz-subtitle">Une seule app, quatre profils de licence, et les pages premium se verrouillent ou s’ouvrent selon les entitlements actifs.</div>
              </div>
              <DashboardToolbar compact wrap>
                <QBtn flat color="secondary" icon="refresh" label="Rafraîchir" :loading="pending" @click="refresh(true)" />
                <QBtn unelevated color="primary" icon="vpn_key" label="License Center" to="/license-center" />
              </DashboardToolbar>
            </div>
          </QCardSection>

          <QTabs v-model="activeTab" dense indicator-color="primary" active-color="primary" class="px-4 md:px-5 overflow-x-auto whitespace-nowrap">
            <QTab name="edition" icon="workspace_premium" label="Edition courante" />
            <QTab name="scenarios" icon="science" label="Scénarios de test" />
            <QTab name="matrix" icon="table_chart" label="Matrice & gates" />
          </QTabs>
          <QSeparator />

          <QTabPanels v-model="activeTab" animated keep-alive>
            <QTabPanel name="edition" class="p-4 md:p-5">
              <div class="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                <QCard flat bordered class="dash-panel p-4 md:p-5">
                  <QCardSection class="p-0">
                    <div class="dash-kicker">Edition active</div>
                    <div class="mt-1 text-xl font-semibold nfz-title">{{ edition.title }}</div>
                    <div class="mt-1 text-sm nfz-subtitle">{{ edition.copy }}</div>
                  </QCardSection>

                  <QSeparator class="my-4" />

                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="builder-soft-card px-4 py-4 text-sm">
                      <div class="builder-panel-title mb-2">Focus produit</div>
                      <div class="flex flex-wrap gap-2">
                        <QChip v-for="focus in edition.focus || []" :key="focus" dense color="grey-8">{{ focus }}</QChip>
                      </div>
                    </div>
                    <div class="builder-soft-card px-4 py-4 text-sm">
                      <div class="builder-panel-title mb-2">Runtime</div>
                      <div class="dash-info-list text-sm">
                        <div class="dash-info-row"><span>Customer</span><strong>{{ license.customer || 'n/a' }}</strong></div>
                        <div class="dash-info-row"><span>Status licence</span><strong>{{ license.status || 'n/a' }}</strong></div>
                        <div class="dash-info-row"><span>Source</span><strong>{{ runtime.licenseSource || 'default' }}</strong></div>
                        <div class="dash-info-row"><span>Workspace</span><strong>{{ runtime.builderApplyMode || 'workspace' }}</strong></div>
                      </div>
                    </div>
                  </div>

                  <QSeparator class="my-4" />

                  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div v-for="link in quickLinks" :key="link.to" class="builder-soft-card px-4 py-4">
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <div class="font-medium nfz-title">{{ link.label }}</div>
                          <div class="mt-1 text-xs nfz-subtitle">{{ link.to }}</div>
                        </div>
                        <QBadge :color="link.allowed ? 'positive' : 'grey-7'" rounded>{{ link.allowed ? 'open' : 'locked' }}</QBadge>
                      </div>
                      <div class="mt-3 flex gap-2">
                        <QBtn v-if="link.allowed" flat color="primary" size="sm" icon="open_in_new" :to="link.to" label="Ouvrir" />
                        <QBtn v-else flat color="secondary" size="sm" icon="lock_open" :to="`/studio-editions?blocked=${link.requiredFeature || ''}&from=${encodeURIComponent(link.to)}`" label="Voir l’édition" />
                      </div>
                    </div>
                  </div>
                </QCard>

                <DashboardInspectorPanel
                  kicker="Support"
                  title="Repères d’exploitation"
                  subtitle="Vue rapide de la licence et de la posture produit de l’édition active."
                  :badges="contextItems"
                  compact
                >
                  <div class="dash-info-list text-sm">
                    <div class="dash-info-row"><span>Tagline</span><strong>{{ edition.tagline || 'n/a' }}</strong></div>
                    <div class="dash-info-row"><span>Seats</span><strong>{{ edition.seats || 0 }}</strong></div>
                    <div class="dash-info-row"><span>Support</span><strong>{{ edition.supportLevel || 'community' }}</strong></div>
                    <div class="dash-info-row"><span>Valid</span><strong>{{ license.valid ? 'oui' : 'non' }}</strong></div>
                    <div class="dash-info-row"><span>Feature count</span><strong>{{ featureMatrix.items?.length || 0 }}</strong></div>
                  </div>
                </DashboardInspectorPanel>
              </div>
            </QTabPanel>

            <QTabPanel name="scenarios" class="p-4 md:p-5">
              <div class="grid gap-4 2xl:grid-cols-2">
                <QCard v-for="scenario in scenarios" :key="scenario.key" flat bordered class="dash-panel p-4 md:p-5">
                  <QCardSection class="p-0">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="dash-kicker">{{ scenario.provider }}</div>
                        <div class="mt-1 text-lg font-semibold nfz-title">{{ scenario.title }}</div>
                        <div class="mt-1 text-sm nfz-subtitle">{{ scenario.summary }}</div>
                      </div>
                      <QBadge :color="scenario.edition === edition.key ? 'primary' : 'grey-7'" rounded>
                        {{ scenario.edition === edition.key ? 'actif' : scenario.edition }}
                      </QBadge>
                    </div>
                  </QCardSection>

                  <QSeparator class="my-4" />

                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="builder-soft-card px-4 py-4 text-sm">
                      <div class="builder-panel-title mb-2">Customer de test</div>
                      <div class="dash-info-list text-sm">
                        <div class="dash-info-row"><span>Email</span><strong>{{ scenario.customer.email }}</strong></div>
                        <div class="dash-info-row"><span>Nom</span><strong>{{ scenario.customer.name }}</strong></div>
                        <div class="dash-info-row"><span>Company</span><strong>{{ scenario.customer.company }}</strong></div>
                      </div>
                    </div>
                    <div class="builder-soft-card px-4 py-4 text-sm">
                      <div class="builder-panel-title mb-2">Edition ciblée</div>
                      <div class="dash-info-list text-sm">
                        <div class="dash-info-row"><span>Variant</span><strong>{{ scenario.nfzStudio.variantName }}</strong></div>
                        <div class="dash-info-row"><span>Use case</span><strong>{{ scenario.nfzStudio.targetUseCase }}</strong></div>
                        <div class="dash-info-row"><span>Seats</span><strong>{{ scenario.descriptor.seats }}</strong></div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2 text-xs">
                    <QChip v-for="feature in scenario.descriptor.features" :key="feature" dense square color="grey-8">{{ feature }}</QChip>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs">
                    <QChip v-for="note in scenario.notes" :key="note" dense color="secondary">{{ note }}</QChip>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
                    <QBtn
                      unelevated
                      color="primary"
                      icon="play_arrow"
                      :label="scenario.edition === edition.key ? 'Réappliquer' : `Activer ${scenario.edition}`"
                      :loading="applying === scenario.key"
                      @click="handleApplyScenario(scenario.key)"
                    />
                    <QBtn flat color="secondary" icon="manage_accounts" to="/license-center" label="Voir la licence" />
                  </div>
                </QCard>
              </div>
            </QTabPanel>

            <QTabPanel name="matrix" class="p-4 md:p-5">
              <div class="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                <LicenseFeatureGrid :items="featureMatrix.items || []" title="Feature gates actifs" />
                <div class="grid gap-5">
                  <LicensePlanCompare :plans="editions" :current-plan="edition.key" />
                  <FeatureGatePanel
                    title="Route gating"
                    copy="Les routes premium sont maintenant protégées par middleware : une édition trop basse renvoie vers cette page avec le feature manquant."
                    :allowed="true"
                    cta-label="Essayer le Services Manager"
                    cta-to="/services-manager"
                  >
                    <div class="dash-info-list text-sm">
                      <div class="dash-info-row"><span>Blocked feature</span><strong>{{ blockedFeature || 'aucun' }}</strong></div>
                      <div class="dash-info-row"><span>From route</span><strong>{{ fromRoute || 'n/a' }}</strong></div>
                      <div class="dash-info-row"><span>Pages verrouillées</span><strong>{{ lockedQuickLinkCount }}</strong></div>
                    </div>
                  </FeatureGatePanel>
                </div>
              </div>
            </QTabPanel>
          </QTabPanels>
        </QCard>
      </div>
    </DashboardSectionCard>
  </QPage>
</template>
