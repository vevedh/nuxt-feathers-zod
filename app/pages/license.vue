<script setup lang="ts">
import DashboardSectionCard from '../components/dashboard/kit/DashboardSectionCard.vue'
import DashboardContextBar from '../components/dashboard/kit/DashboardContextBar.vue'
import DashboardInspectorPanel from '../components/dashboard/kit/DashboardInspectorPanel.vue'
import type { DashboardContextItem } from '../components/dashboard/kit/DashboardContextBar.vue'

const { data, pending, refresh } = await useFetch('/api/license/status', { default: () => ({ ok: false, runtime: null, license: null }) })

const license = computed(() => (data.value as any)?.license || {})
const runtime = computed(() => (data.value as any)?.runtime || {})
const contextItems = computed<DashboardContextItem[]>(() => [
  { label: 'Edition', value: String(license.value.edition || runtime.value.edition || 'n/a'), icon: 'mdi-docker', tone: 'primary' },
  { label: 'Plan', value: String(license.value.plan || runtime.value.plan || 'n/a'), icon: 'mdi-label-outline', tone: 'secondary' },
  { label: 'Licence', value: String(license.value.status || 'n/a'), icon: 'mdi-key-chain-variant', tone: license.value.status === 'licensed' ? 'positive' : (license.value.status === 'grace' ? 'warning' : 'negative') },
  { label: 'Apply mode', value: String(runtime.value.builderApplyMode || 'workspace'), icon: 'mdi-folder-cog-outline', tone: 'info' },
  { label: 'Data dir', value: String(runtime.value.paths?.dataDir || 'n/a'), icon: 'mdi-database-outline', tone: 'accent' },
  { label: 'Workspace', value: String(runtime.value.paths?.workspaceDir || 'n/a'), icon: 'mdi-folder-outline', tone: 'warning' },
])
</script>

<template>
  <QPage class="dash-page">
    <DashboardSectionCard
      kicker="Product"
      title="Licence / Édition"
      copy="Vue opérationnelle de l'édition NFZ Studio : licence, chemins runtime, mode builder et fonctions activées."
      dense
    >
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="grid gap-5">
          <DashboardContextBar :items="contextItems" />

          <QCard flat bordered class="dash-panel p-4 md:p-5">
            <QCardSection class="flex items-center justify-between gap-3 p-0">
              <div>
                <div class="dash-kicker">Statut</div>
                <div class="mt-1 text-lg font-semibold nfz-title">{{ license.status || 'inconnu' }}</div>
                <div class="mt-1 text-sm nfz-subtitle">{{ license.note }}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <QBtn flat color="primary" icon="manage_accounts" label="License Center" to="/license-center" />
                <QBtn unelevated color="primary" icon="refresh" label="Rafraîchir" :loading="pending" @click="refresh()" />
              </div>
            </QCardSection>

            <QSeparator class="my-4" />

            <div class="grid gap-4 md:grid-cols-2">
              <div class="builder-soft-card px-4 py-4 text-sm">
                <div class="builder-panel-title mb-2">Fonctions activées</div>
                <div class="flex flex-wrap gap-2">
                  <QChip v-for="feature in license.features || runtime.features || []" :key="feature" dense color="primary" text-color="white" icon="mdi-check-circle-outline">
                    {{ feature }}
                  </QChip>
                </div>
              </div>
              <div class="builder-soft-card px-4 py-4 text-sm">
                <div class="builder-panel-title mb-2">Chemins runtime</div>
                <div class="dash-info-list text-xs">
                  <div class="dash-info-row"><span>Data</span><strong>{{ runtime.paths?.dataDir }}</strong></div>
                  <div class="dash-info-row"><span>Workspace</span><strong>{{ runtime.paths?.workspaceDir }}</strong></div>
                  <div class="dash-info-row"><span>Exports</span><strong>{{ runtime.paths?.exportDir }}</strong></div>
                  <div class="dash-info-row"><span>Seed</span><strong>{{ runtime.paths?.seedDir }}</strong></div>
                </div>
              </div>
            </div>

            <QSeparator class="my-4" />

            <div class="dash-info-list text-sm">
              <div class="dash-info-row"><span>Customer</span><strong>{{ license.customer || 'non renseigné' }}</strong></div>
              <div class="dash-info-row"><span>Fingerprint</span><strong>{{ license.fingerprint || 'aucune clé' }}</strong></div>
              <div class="dash-info-row"><span>Expires</span><strong>{{ license.expiresAt || 'aucune date' }}</strong></div>
              <div class="dash-info-row"><span>Grace</span><strong>{{ license.graceDays || 0 }} jours</strong></div>
              <div class="dash-info-row"><span>Devtools</span><strong>{{ runtime.flags?.devtoolsEnabled ? 'on' : 'off' }}</strong></div>
              <div class="dash-info-row"><span>Mongo admin</span><strong>{{ runtime.flags?.mongoAdminEnabled ? 'on' : 'off' }}</strong></div>
              <div class="dash-info-row"><span>Mongo dangerous</span><strong>{{ runtime.flags?.mongoAdminDangerous ? 'on' : 'off' }}</strong></div>
              <div class="dash-info-row"><span>ADCS</span><strong>{{ runtime.flags?.adcsEnabled ? 'on' : 'off' }}</strong></div>
              <div class="dash-info-row"><span>Dummy user</span><strong>{{ runtime.flags?.seedDummyUser ? 'on' : 'off' }}</strong></div>
            </div>
          </QCard>
        </div>

        <DashboardInspectorPanel
          kicker="Docker Edition"
          title="Repères produit"
          subtitle="Ce panneau t’aide à vérifier rapidement que l’app tourne avec la bonne édition, les bons volumes et les bons drapeaux runtime."
          :badges="contextItems"
          compact
        >
          <div class="dash-info-list text-sm">
            <div class="dash-info-row"><span>Mode builder</span><strong>{{ runtime.builderApplyMode || 'workspace' }}</strong></div>
            <div class="dash-info-row"><span>Workspace prêt</span><strong>{{ license.workspaceExists ? 'oui' : 'non' }}</strong></div>
            <div class="dash-info-row"><span>Seed prêt</span><strong>{{ license.seedExists ? 'oui' : 'non' }}</strong></div>
            <div class="dash-info-row"><span>Licence valide</span><strong>{{ license.valid ? 'oui' : 'non' }}</strong></div>
          </div>
        </DashboardInspectorPanel>
      </div>
    </DashboardSectionCard>
  </QPage>
</template>
