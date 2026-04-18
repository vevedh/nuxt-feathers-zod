<script setup lang="ts">
import DashboardSectionCard from '../components/dashboard/kit/DashboardSectionCard.vue'
import DashboardInspectorPanel from '../components/dashboard/kit/DashboardInspectorPanel.vue'
import DashboardToolbar from '../components/dashboard/kit/DashboardToolbar.vue'
import LicenseStatusCard from '../components/dashboard/license/LicenseStatusCard.vue'
import LicenseFeatureGrid from '../components/dashboard/license/LicenseFeatureGrid.vue'
import LicensePlanCompare from '../components/dashboard/license/LicensePlanCompare.vue'
import FeatureGatePanel from '../components/dashboard/license/FeatureGatePanel.vue'
import { LICENSE_PLANS } from '../utils/license-features'

const sampleLicense = {
  customer: 'Acme Studio',
  plan: 'studio',
  edition: 'studio',
  expiresAt: '2027-03-31T00:00:00.000Z',
  features: ['builder', 'builder-advanced', 'diagnostics', 'diagnostics-export', 'mongo-admin', 'auth-demo', 'crud-demo', 'license-center'],
  metadata: {
    seats: 3,
    note: 'Exemple de licence locale pour NFZ Studio.',
  },
}

const centerTab = ref<'overview' | 'features' | 'plans'>('overview')

const { data: statusData, pending: statusPending, refresh: refreshStatus } = await useFetch('/api/license/status', {
  default: () => ({ ok: false, runtime: {}, license: {} }),
})

const { data: featuresData, pending: featuresPending, refresh: refreshFeatures } = await useFetch('/api/license/features', {
  default: () => ({ ok: false, items: [], plans: [] }),
})

const runtime = computed(() => (statusData.value as any)?.runtime || {})
const license = computed(() => (statusData.value as any)?.license || {})
const featureItems = computed(() => (featuresData.value as any)?.items || [])
const plans = computed(() => ((featuresData.value as any)?.plans || LICENSE_PLANS))
const overviewTabs = [
  { name: 'overview', icon: 'dashboard_customize', label: 'Overview', caption: 'Statut, éditeur et composants de gate.' },
  { name: 'features', icon: 'tune', label: 'Features', caption: 'Matrice complète des options licenciables.' },
  { name: 'plans', icon: 'workspace_premium', label: 'Plans', caption: 'Comparaison des éditions disponibles.' },
]

const licenseDraft = ref(JSON.stringify(sampleLicense, null, 2))
const busy = ref(false)
const actionTone = ref<'positive' | 'warning' | 'negative' | 'info'>('info')
const actionMessage = ref('')
const validationIssues = ref<string[]>([])

const builderAdvancedFeature = computed(() => featureItems.value.find((item: any) => item.key === 'builder-advanced'))
const mongoDangerousFeature = computed(() => featureItems.value.find((item: any) => item.key === 'mongo-dangerous'))
const activeFeatureCount = computed(() => featureItems.value.filter((item: any) => item.state === 'enabled').length)
const lockedFeatureCount = computed(() => featureItems.value.filter((item: any) => item.state === 'locked').length)
const disabledFeatureCount = computed(() => featureItems.value.filter((item: any) => item.state === 'disabled').length)

function setFeedback(tone: 'positive' | 'warning' | 'negative' | 'info', message: string, issues: string[] = []) {
  actionTone.value = tone
  actionMessage.value = message
  validationIssues.value = issues
}

function parseDraft() {
  try {
    const parsed = JSON.parse(licenseDraft.value || '{}')
    return { ok: true as const, value: parsed }
  }
  catch (error: any) {
    return { ok: false as const, error: error?.message || 'JSON invalide' }
  }
}

function loadSample() {
  licenseDraft.value = JSON.stringify(sampleLicense, null, 2)
  setFeedback('info', 'Exemple de licence chargé dans l’éditeur.')
}

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshFeatures()])
}

async function postLicenseAction(url: string) {
  const parsed = parseDraft()
  if (!parsed.ok) {
    setFeedback('negative', `Impossible de lire le JSON : ${parsed.error}`)
    return
  }

  busy.value = true
  try {
    const result = await $fetch<any>(url, { method: 'POST', body: parsed.value })
    if (result.ok) {
      setFeedback('positive', url.includes('validate') ? 'Licence valide.' : 'Licence appliquée avec succès.', result.issues || [])
      await refreshAll()
    }
    else {
      setFeedback('warning', 'La licence doit être corrigée avant application.', result.issues || [])
    }
  }
  catch (error: any) {
    setFeedback('negative', error?.message || 'Action impossible.')
  }
  finally {
    busy.value = false
  }
}

async function validateDraft() {
  await postLicenseAction('/api/license/validate')
}

async function applyDraft() {
  await postLicenseAction('/api/license/apply')
}

async function removeLicense() {
  busy.value = true
  try {
    await $fetch('/api/license/remove', { method: 'POST' })
    setFeedback('warning', 'Licence locale supprimée. Les variables d’environnement restent prioritaires si elles sont définies.')
    await refreshAll()
  }
  catch (error: any) {
    setFeedback('negative', error?.message || 'Suppression impossible.')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <QPage class="dash-page">
    <DashboardSectionCard
      kicker="Product"
      title="License Center"
      copy="Centre de pilotage des licences NFZ Studio : statut, features, validation locale et composants réutilisables pour les futures options premium."
      dense
      no-separator
    >
      <div class="grid gap-5">
        <div class="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <LicenseStatusCard :license="license" :runtime="runtime" />

          <div class="grid gap-5">
            <QCard flat bordered class="dash-panel p-4 md:p-5">
              <QCardSection class="p-0">
                <div class="dash-kicker">Actions rapides</div>
                <div class="mt-1 text-lg font-semibold nfz-title">Piloter la licence locale</div>
                <div class="mt-1 text-sm nfz-subtitle">Charge un exemple, vérifie la validité JSON, puis valide ou applique la licence locale.</div>
              </QCardSection>

              <QSeparator class="my-4" />

              <DashboardToolbar compact wrap>
                <QBtn flat color="primary" icon="mdi-flask-outline" label="Exemple" @click="loadSample" />
                <QBtn flat color="secondary" icon="refresh" :loading="statusPending || featuresPending" label="Rafraîchir" @click="refreshAll" />
                <QBtn color="primary" unelevated icon="fact_check" label="Valider" :loading="busy" @click="validateDraft" />
                <QBtn color="secondary" unelevated icon="vpn_key" label="Appliquer" :loading="busy" @click="applyDraft" />
              </DashboardToolbar>
            </QCard>

            <DashboardInspectorPanel
              kicker="Runtime"
              title="Repères d’activation"
              subtitle="Résumé clair pour savoir d’où vient la licence et comment le runtime est configuré."
              compact
              collapsible
            >
              <div class="dash-info-list text-sm">
                <div class="dash-info-row"><span>Source</span><strong>{{ license.source || runtime.licenseSource || 'default' }}</strong></div>
                <div class="dash-info-row"><span>Licence file</span><strong class="break-all text-right">{{ runtime.licenseFilePath || 'n/a' }}</strong></div>
                <div class="dash-info-row"><span>Edition</span><strong>{{ license.edition || runtime.edition || 'community' }}</strong></div>
                <div class="dash-info-row"><span>Plan</span><strong>{{ license.plan || runtime.plan || 'community' }}</strong></div>
                <div class="dash-info-row"><span>Apply mode</span><strong>{{ runtime.builderApplyMode || 'workspace' }}</strong></div>
                <div class="dash-info-row"><span>Workspace</span><strong class="break-all text-right">{{ runtime.paths?.workspaceDir || 'n/a' }}</strong></div>
              </div>
            </DashboardInspectorPanel>
          </div>
        </div>

        <QCard flat bordered class="dash-panel overflow-hidden">
          <QCardSection class="p-4 md:p-5 pb-3">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="dash-kicker">Navigation</div>
                <div class="mt-1 text-lg font-semibold nfz-title">Vue claire par sections</div>
                <div class="mt-1 text-sm nfz-subtitle">Overview pour éditer, Features pour la matrice licenciable, Plans pour comparer les éditions.</div>
              </div>
              <div class="flex flex-wrap gap-2 text-xs">
                <QChip dense square color="positive">Actives {{ activeFeatureCount }}</QChip>
                <QChip dense square color="warning" text-color="dark">Désactivées {{ disabledFeatureCount }}</QChip>
                <QChip dense square color="secondary">Verrouillées {{ lockedFeatureCount }}</QChip>
              </div>
            </div>
          </QCardSection>

          <QTabs v-model="centerTab" dense indicator-color="primary" active-color="primary" class="px-4 md:px-5 overflow-x-auto whitespace-nowrap">
            <QTab v-for="tab in overviewTabs" :key="tab.name" :name="tab.name" :icon="tab.icon" :label="tab.label" />
          </QTabs>
          <QSeparator />

          <QTabPanels v-model="centerTab" animated keep-alive>
            <QTabPanel name="overview" class="p-4 md:p-5">
              <div class="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                <QCard flat bordered class="dash-panel p-4 md:p-5">
                  <QCardSection class="p-0">
                    <div class="dash-kicker">Gestion</div>
                    <div class="mt-1 text-lg font-semibold nfz-title">Éditeur de licence locale</div>
                    <div class="mt-1 text-sm nfz-subtitle">Zone principale d’édition. Les actions restent au-dessus pour alléger la lecture sur desktop et mobile.</div>
                  </QCardSection>

                  <QSeparator class="my-4" />

                  <QInput
                    v-model="licenseDraft"
                    type="textarea"
                    outlined
                    autogrow
                    class="font-mono"
                    label="Licence JSON"
                    :input-style="{ minHeight: '260px' }"
                  />

                  <div class="mt-4 flex flex-wrap gap-2">
                    <QBtn color="negative" flat icon="delete_outline" label="Supprimer la licence locale" :loading="busy" @click="removeLicense" />
                  </div>

                  <QBanner v-if="actionMessage" rounded class="mt-4" :class="actionTone === 'positive' ? 'bg-green-500/15 text-green-1' : actionTone === 'warning' ? 'bg-yellow-500/15 text-yellow-1' : actionTone === 'negative' ? 'bg-red-500/15 text-red-1' : 'bg-[var(--nfz-primary-soft)]'">
                    <div class="font-medium">{{ actionMessage }}</div>
                    <ul v-if="validationIssues.length" class="mt-2 list-disc pl-5 text-sm">
                      <li v-for="issue in validationIssues" :key="issue">{{ issue }}</li>
                    </ul>
                  </QBanner>
                </QCard>

                <div class="grid gap-5">
                  <FeatureGatePanel
                    title="Composant réutilisable : Builder Studio"
                    copy="Exemple de gate visuel réutilisable pour verrouiller certaines expériences avancées du builder."
                    :allowed="builderAdvancedFeature?.state === 'enabled'"
                    :reason="builderAdvancedFeature?.reason"
                    cta-label="Ouvrir Builder demo"
                    cta-to="/builder-demo"
                  >
                    <div class="dash-info-list text-sm">
                      <div class="dash-info-row"><span>Preset premium</span><strong>autorisés</strong></div>
                      <div class="dash-info-row"><span>Barrels / apply avancé</span><strong>activés</strong></div>
                    </div>
                  </FeatureGatePanel>

                  <FeatureGatePanel
                    title="Composant réutilisable : Mongo actions destructives"
                    copy="Exemple de gate pour une fonctionnalité sensible, visible mais non activée par défaut."
                    :allowed="mongoDangerousFeature?.state === 'enabled'"
                    :reason="mongoDangerousFeature?.reason"
                    cta-label="Ouvrir Mongo admin"
                    cta-to="/mongo-mgmt"
                  >
                    <div class="dash-info-list text-sm">
                      <div class="dash-info-row"><span>Drop DB / collection</span><strong>autorisés</strong></div>
                      <div class="dash-info-row"><span>Remove documents</span><strong>autorisés</strong></div>
                    </div>
                  </FeatureGatePanel>
                </div>
              </div>
            </QTabPanel>

            <QTabPanel name="features" class="p-4 md:p-5">
              <LicenseFeatureGrid :items="featureItems" title="Matrice des options licenciables" />
            </QTabPanel>

            <QTabPanel name="plans" class="p-4 md:p-5">
              <LicensePlanCompare :plans="plans" :current-plan="license.plan || runtime.plan" />
            </QTabPanel>
          </QTabPanels>
        </QCard>
      </div>
    </DashboardSectionCard>
  </QPage>
</template>
