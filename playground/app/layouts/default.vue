<script setup lang="ts">
const drawerOpen = ref(false)
const route = useRoute()
const { groups, isActive } = usePlaygroundNavigation()
const { title, clientMode, embeddedMongoMode } = usePlaygroundScenario()
const auth = useAuth()
const config = useRuntimeConfig()

const activeItem = computed(() => groups.flatMap(group => group.items).find(item => isActive(item.to)))

useHead(() => ({
  title: `${activeItem.value?.label || 'Playground'} · NFZ`,
}))

const version = computed(() => String((config.public as Record<string, any>)?.nfzPlayground?.moduleVersion || 'dev'))
const provider = computed(() => auth.provider.value || 'none')

watch(() => route.fullPath, () => {
  drawerOpen.value = false
})

onMounted(() => {
  auth.init().catch(() => {})
})
</script>

<template>
  <div class="nfz-playground">
    <NuxtLoadingIndicator color="var(--nfz-accent)" :height="3" />

    <header class="nfz-mobile-header">
      <button class="nfz-icon-button" type="button" aria-label="Ouvrir la navigation" @click="drawerOpen = !drawerOpen">
        <span /><span /><span />
      </button>
      <NuxtLink to="/" class="nfz-mobile-brand">NFZ Lab</NuxtLink>
      <PlaygroundStatusBadge :label="clientMode" tone="info" />
    </header>

    <button v-if="drawerOpen" class="nfz-drawer-backdrop" type="button" aria-label="Fermer la navigation" @click="drawerOpen = false" />

    <aside class="nfz-sidebar" :class="{ 'nfz-sidebar--open': drawerOpen }">
      <div class="nfz-brand">
        <NuxtLink to="/" class="nfz-brand__mark">NFZ</NuxtLink>
        <div>
          <strong>Playground</strong>
          <span>Centre de validation du module</span>
        </div>
      </div>

      <div class="nfz-runtime-card">
        <div class="nfz-runtime-card__top">
          <span>Scénario actif</span>
          <PlaygroundStatusBadge :label="clientMode" tone="info" />
        </div>
        <strong>{{ title }}</strong>
        <div class="nfz-runtime-card__meta">
          <span>Auth : {{ provider }}</span>
          <span>Mongo : {{ embeddedMongoMode }}</span>
        </div>
      </div>

      <nav class="nfz-nav" aria-label="Navigation du playground">
        <section v-for="group in groups" :key="group.label" class="nfz-nav-group">
          <p>{{ group.label }}</p>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nfz-nav-link"
            :class="{ 'nfz-nav-link--active': isActive(item.to) }"
          >
            <span class="nfz-nav-link__icon" aria-hidden="true">{{ item.icon }}</span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </NuxtLink>
        </section>
      </nav>

      <footer class="nfz-sidebar__footer">
        <span>nuxt-feathers-zod</span>
        <strong>v{{ version }}</strong>
      </footer>
    </aside>

    <main class="nfz-main">
      <div class="nfz-main__inner">
        <slot />
      </div>
    </main>
  </div>
</template>
