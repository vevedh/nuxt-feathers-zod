<script setup lang="ts">
import TraceDrawer from '~/components/dashboard/TraceDrawer.vue'
const drawerOpen = useState<boolean>('nfz-left-drawer-open', () => true)
const route = useRoute()
const q = useQuasar()
const { currentUsername, logout, loading } = useLocalAuthUi()
const theme = useState<'light' | 'dark'>('nfz-theme', () => 'light')
const diagnosticsOpen = ref(false)
const { applyCssVars } = useNfzThemeBuilder()
const { state: studioEditionState, refresh: refreshStudioEdition } = useStudioEdition()
await refreshStudioEdition()

const studioEdition = computed(() => studioEditionState.value || {})
const currentEdition = computed(() => studioEdition.value.edition || { key: 'community', title: 'NFZ Studio Community', tagline: 'Découverte locale', supportLevel: 'community' })
const enabledFeatureCount = computed(() => (studioEdition.value.featureMatrix?.items || []).filter((item: any) => item.state === 'enabled').length)
const navLinks = computed(() => {
  const remote = studioEdition.value.quickLinks || []
  const staticLinks = [
    { label: 'Accueil', to: '/', icon: 'home', allowed: true },
    { label: 'Studio Editions', to: '/studio-editions', icon: 'workspace_premium', allowed: true },
    { label: 'Theme Builder', to: '/theme-builder', icon: 'palette', allowed: true },
    { label: 'QGrid test', to: '/qgrid-test', icon: 'table_view', allowed: true },
    { label: 'Utilisateurs', to: '/users', icon: 'group', allowed: true },
    { label: 'Admin', to: '/admin', icon: 'settings', allowed: true },
  ]
  return [
    ...staticLinks.slice(0, 2),
    ...remote,
    ...staticLinks.slice(2),
  ]
})

function diagnosticsToggle() {
  diagnosticsOpen.value = !diagnosticsOpen.value
}

function openDrawer() {
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
}

function applyTheme(next: 'light' | 'dark') {
  theme.value = next
  q.dark.set(next === 'dark')
  if (import.meta.client) localStorage.setItem('nfz-theme', next)
  applyCssVars()
}
function toggleTheme() { applyTheme(theme.value === 'light' ? 'dark' : 'light') }
async function onLogout() { await logout(); await navigateTo('/login') }

function resolveLinkTarget(link: any) {
  if (link.allowed || !link.requiredFeature) return link.to
  return { path: '/studio-editions', query: { blocked: link.requiredFeature, from: link.to } }
}

onMounted(() => {
  const saved = import.meta.client ? localStorage.getItem('nfz-theme') : null
  const savedDrawer = import.meta.client ? localStorage.getItem('nfz-left-drawer-open') : null
  if (savedDrawer === '0') drawerOpen.value = false
  if (savedDrawer === '1') drawerOpen.value = true
  applyTheme(saved === 'dark' ? 'dark' : 'light')
  applyCssVars()
})

watch(drawerOpen, (value) => {
  if (import.meta.client) localStorage.setItem('nfz-left-drawer-open', value ? '1' : '0')
})
</script>

<template>
  <QLayout view="hHh lpR fFf" class="min-h-screen">
    <QHeader bordered class="nfz-header-gradient text-white">
      <QToolbar class="h-18 px-4 md:px-6">
        <QBtn flat round dense icon="menu" color="white" @click="toggleDrawer" />
        <QToolbarTitle class="flex items-center gap-3 min-w-0">
          <div class="i-carbon-cloud-service-management text-2xl" />
          <div class="min-w-0">
            <div class="text-subtitle1 font-bold truncate">{{ currentEdition.title }}</div>
            <div class="text-caption text-white/85 truncate">{{ currentEdition.tagline }} · Local auth · Quasar + UnoCSS · Edition-aware runtime</div>
          </div>
        </QToolbarTitle>
        <QChip dense square color="white" text-color="primary" class="hidden md:flex">{{ currentEdition.key }}</QChip>
        <QBtn round dense flat icon="mdi-chart-box-outline" color="white" @click="diagnosticsToggle">
          <QTooltip>Diagnostics</QTooltip>
        </QBtn>
        <QBtn round dense flat :icon="theme === 'dark' ? 'light_mode' : 'dark_mode'" color="white" @click="toggleTheme">
          <QTooltip>{{ theme === 'dark' ? 'Thème clair' : 'Thème sombre' }}</QTooltip>
        </QBtn>
        <div class="hidden md:flex items-center gap-2">
          <div class="session-chip rounded-4 px-3 py-2 text-sm">{{ currentUsername }}</div>
          <QBtn color="white" text-color="primary" unelevated icon="logout" label="Déconnexion" :loading="loading" @click="onLogout" />
        </div>
      </QToolbar>
    </QHeader>

    <QDrawer
      v-model="drawerOpen"
      side="left"
      :width="300"
      :overlay="$q.screen.lt.lg"
      bordered
      class="bg-[var(--nfz-surface)] text-[var(--nfz-text)]"
      @hide="closeDrawer"
      @show="openDrawer"
    >
      <div class="p-4 md:p-5 flex h-full flex-col gap-4">
        <div class="dash-panel p-4">
          <div class="dash-kicker">Workspace</div>
          <div class="mt-2 text-lg font-semibold nfz-title">{{ currentEdition.title }}</div>
          <div class="mt-1 text-sm nfz-subtitle leading-relaxed">Une seule app NFZ Studio, quatre profils de licence, et un feature gating visible directement dans la navigation.</div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <QChip dense square color="grey-8">{{ currentEdition.tagline }}</QChip>
            <QChip dense square color="primary">{{ currentEdition.supportLevel }}</QChip>
          </div>
        </div>

        <nav class="flex flex-col gap-2">
          <NuxtLink
            v-for="link in navLinks"
            :key="typeof link.to === 'string' ? link.to : JSON.stringify(link.to)"
            :to="resolveLinkTarget(link)"
            class="group nav-item no-underline justify-between"
            :class="route.path === link.to ? 'bg-[var(--nfz-primary-soft)] text-[var(--nfz-primary)]' : (!link.allowed ? 'opacity-85' : '')"
          >
            <div class="flex items-center gap-3 min-w-0">
              <QIcon :name="link.icon" size="18px" class="transition-transform duration-250 group-hover:scale-110" />
              <span class="truncate">{{ link.label }}</span>
            </div>
            <QBadge v-if="link.allowed === false" color="grey-7" rounded class="ml-2">locked</QBadge>
          </NuxtLink>
        </nav>

        <div class="dash-panel p-4">
          <div class="dash-kicker">Session</div>
          <div class="mt-2 text-sm nfz-title">{{ currentUsername }}</div>
          <div class="mt-1 text-xs nfz-subtitle">Provider local NFZ embedded</div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <QChip dense color="primary">{{ currentEdition.key }}</QChip>
            <QChip dense color="grey-8">{{ enabledFeatureCount }} features actives</QChip>
          </div>
        </div>

        <div class="mt-auto dash-soft-panel text-sm">
          <div class="font-medium nfz-title mb-1">UI layer</div>
          <div class="nfz-subtitle">Quasar pour les composants, UnoCSS pour les surfaces, transitions et utilitaires. La navigation reflète maintenant directement l’édition active.</div>
        </div>
      </div>
    </QDrawer>



    <QPageSticky
      v-if="!drawerOpen"
      position="left"
      :offset="[12, 88]"
      class="z-[2200]"
    >
      <QBtn
        round
        unelevated
        color="primary"
        icon="menu"
        class="shadow-lg"
        @click="openDrawer"
      >
        <QTooltip>Ouvrir le menu</QTooltip>
      </QBtn>
    </QPageSticky>

    <TraceDrawer v-model="diagnosticsOpen" />

    <QPageContainer>
      <div class="page-shell min-h-[calc(100vh-72px)] p-4 md:p-6 lg:p-8">
        <slot />
      </div>
    </QPageContainer>
  </QLayout>
</template>
