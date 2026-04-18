<script setup lang="ts">
const { loading, error, leftMenus, rightMenus, users, refresh, seedMenus } = useDashboardData()
const { currentUsername } = useLocalAuthUi()
const { state: studioEditionState, refresh: refreshStudioEdition } = useStudioEdition()
await refreshStudioEdition()

const studioEdition = computed(() => studioEditionState.value || {})
const edition = computed(() => studioEdition.value.edition || { title: 'NFZ Studio Community', key: 'community' })
const enabledFeatureCount = computed(() => studioEdition.value.featureMatrix?.items?.filter((item: any) => item.state === 'enabled').length || 0)

const stats = computed(() => [
  { label: 'Menus gauche', value: leftMenus.value.length, icon: 'menu' },
  { label: 'Menus droit', value: rightMenus.value.length, icon: 'widgets' },
  { label: 'Users chargés', value: users.value.length, icon: 'group' },
  { label: 'Edition', value: edition.value.key, icon: 'workspace_premium' },
])

const demoCards = [
  { title: 'Studio Editions', to: '/studio-editions', icon: 'workspace_premium', copy: 'Bascule rapidement entre Community, Studio, Pro et Enterprise.' },
  { title: 'Auth demo', to: '/auth-demo', icon: 'lock_open', copy: 'Login, logout, reAuthenticate et inspection de session.' },
  { title: 'CRUD demo', to: '/crud-demo', icon: 'playlist_add_check', copy: 'Create, list, patch et remove sur un vrai service Feathers.' },
  { title: 'Diagnostics', to: '/diagnostics', icon: 'mdi-chart-box-outline', copy: 'Timeline, filtres, export JSON et résumé runtime.' },
  { title: 'Services Manager', to: '/services-manager', icon: 'dataset', copy: 'Manifest, preview, dry-run et apply vers la structure services.' },
  { title: 'License Center', to: '/license-center', icon: 'manage_accounts', copy: 'Centre de gestion des licences, plans et futures options premium.' },
]

onMounted(refresh)
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="NFZ Studio édition-aware" subtitle="Une même app consommateur peut maintenant se comporter comme Community, Studio, Pro ou Enterprise pour valider les entitlements et le feature gating." />

    <section class="dash-panel">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-sm nfz-subtitle">Session courante</div>
          <div class="mt-1 text-xl font-semibold nfz-title">{{ currentUsername }}</div>
        </div>
        <div class="surface-soft context-chip px-4 py-3 text-sm">{{ edition.title }} · {{ enabledFeatureCount }} features actives</div>
      </div>
    </section>

    <section class="dash-kpi-grid">
      <div v-for="item in stats" :key="item.label" class="dash-kpi-card">
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="text-sm nfz-subtitle">{{ item.label }}</div>
            <div class="mt-2 text-2xl font-bold nfz-title">{{ item.value }}</div>
          </div>
          <div class="dash-kpi-icon">
            <QIcon :name="item.icon" size="22px" />
          </div>
        </div>
      </div>
    </section>

    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <div>
          <div class="dash-kicker">Product demos</div>
          <h2 class="mt-2 dash-title">Parcours de démonstration</h2>
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-2 xl:grid-cols-6">
        <NuxtLink v-for="card in demoCards" :key="card.to" :to="card.to" class="surface-soft rounded-5 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nfz-primary-soft)]">
          <div class="flex items-center justify-between gap-3">
            <div class="text-base font-semibold nfz-title">{{ card.title }}</div>
            <QIcon :name="card.icon" size="22px" color="primary" />
          </div>
          <div class="mt-2 text-sm nfz-subtitle">{{ card.copy }}</div>
        </NuxtLink>
      </div>
    </section>

    <section class="dash-panel">
      <div class="flex flex-wrap items-center gap-3">
        <QBtn color="primary" unelevated icon="refresh" label="Rafraîchir" :loading="loading" @click="refresh" />
        <QBtn color="secondary" flat icon="playlist_add" label="Seed home-menus" :loading="loading" @click="seedMenus" />
        <QBtn color="primary" flat icon="workspace_premium" label="Changer d’édition" to="/studio-editions" />
        <div v-if="error" class="rounded-4 border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm text-red-1">{{ error }}</div>
      </div>
    </section>

    <div class="dash-content-grid">
      <AnimatedMenuList :items="leftMenus" title="Menus de navigation" />
      <AnimatedMenuList :items="rightMenus" title="Menus contextuels" />
    </div>
  </QPage>
</template>
