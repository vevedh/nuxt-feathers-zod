<script setup lang="ts">
import DashboardSectionCard from '../components/dashboard/kit/DashboardSectionCard.vue'
import DashboardInspectorPanel from '../components/dashboard/kit/DashboardInspectorPanel.vue'
import { computed, ref } from 'vue'
import { getPresetCount, getStarterCount } from '../utils/builder-presets'
import ServiceSchemaBuilder from '../components/dashboard/ServiceSchemaBuilder.vue'

const theme = useState<'light' | 'dark'>('nfz-theme', () => 'light')
const manifestCount = ref(0)
const serviceModes = ['zod', 'json', 'typebox', 'none']
const presetCount = getPresetCount()
const starterCount = getStarterCount()
const route = useRoute()
const routePreset = computed(() => String(route.query.preset || '').trim() || 'aucun')
const routeStarter = computed(() => String(route.query.starter || '').trim() || 'aucun')
const demoRoutes = [
  { label: 'Démo users', to: '/services-manager?starter=users', tone: 'primary', icon: 'group' },
  { label: 'Démo articles', to: '/services-manager?starter=articles', tone: 'secondary', icon: 'article' },
  { label: 'Mongo CRUD', to: '/services-manager?preset=mongoCrud', tone: 'accent', icon: 'dataset' },
]

const managerSummary = computed(() => ([
  { label: 'Manifest', value: String(manifestCount.value) },
  { label: 'Modes', value: String(serviceModes.length) },
  { label: 'Presets', value: String(presetCount) },
  { label: 'Starters', value: String(starterCount) },
]))

definePageMeta({
  ssr: false,
})
</script>

<template>
  <QPage class="dash-page">
    <DashboardSectionCard
      kicker="Builder Studio"
      title="Services Manager / Builder"
      copy="Workspace dashboard Quasar + UnoCSS : exploration des services, builder, preview multi-fichiers, diff source ↔ généré, presets visibles dans un onglet dédié, modes de vue pédagogiques, cartes d'entrée guidées et apply direct dans le dossier services cible."
      dense
    >
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div class="grid gap-4">
          <div class="builder-soft-card px-4 py-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="builder-panel-title">Lecture simplifiée</div>
                <div class="mt-1 text-sm nfz-subtitle">La page est maintenant organisée pour lire le parcours dans cet ordre : choisir un scénario, configurer le service, puis vérifier et appliquer.</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <QBadge v-for="item in managerSummary" :key="item.label" outline color="grey-7">{{ item.label }} · {{ item.value }}</QBadge>
              </div>
            </div>
          </div>

          <ClientOnly>
            <ServiceSchemaBuilder :dark="theme === 'dark'" @manifest-change="manifestCount = $event.length" />
            <template #fallback>
              <div class="mongo-pane rounded-5 px-5 py-6">
                <div class="text-base font-semibold nfz-title">Chargement du builder…</div>
                <div class="mt-2 text-sm nfz-subtitle">Initialisation du workspace services/schema.</div>
              </div>
            </template>
          </ClientOnly>
        </div>

        <aside class="grid gap-3 content-start xl:sticky xl:top-4 self-start">
          <DashboardInspectorPanel
            compact
            title="Résumé"
            kicker="Workspace"
            subtitle="Garde ici seulement le minimum utile pendant la navigation."
          >
            <div class="grid gap-2 text-sm nfz-subtitle">
              <div><strong class="nfz-title">Tests rapides</strong> : presets et starters sans toucher aux services réels.</div>
              <div><strong class="nfz-title">Services réels</strong> : lecture des services scannés et de leur preview source.</div>
              <div><strong class="nfz-title">Builder avancé</strong> : édition complète, preview multi-fichiers et apply.</div>
            </div>
            <div class="rounded-4 border border-[var(--nfz-border)] bg-white/70 px-3 py-3 text-xs nfz-subtitle dark:bg-[rgba(15,23,42,0.42)]">
              <div>Preset route : <strong class="nfz-title">{{ routePreset }}</strong></div>
              <div class="mt-1">Starter route : <strong class="nfz-title">{{ routeStarter }}</strong></div>
            </div>
          </DashboardInspectorPanel>

          <DashboardInspectorPanel
            compact
            title="Démos rapides"
            kicker="Actions"
            subtitle="Ouvre seulement si tu veux injecter une démo ou un starter."
            collapsible
            :default-open="false"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:flex-col">
              <QBtn v-for="item in demoRoutes" :key="item.to" dense no-caps unelevated :color="item.tone" :icon="item.icon" :label="item.label" :to="item.to" class="justify-start" />
            </div>
          </DashboardInspectorPanel>
        </aside>
      </div>
    </DashboardSectionCard>
  </QPage>
</template>
