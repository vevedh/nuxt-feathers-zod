<script setup lang="ts">
import { Badge, Button } from 'daisy-ui-kit'
import type { AppTheme } from '~/stores/theme'

const route = useRoute()
const session = useStudioSessionStore()
const theme = useThemeStore()
const runtimeConfig = useRuntimeConfig()

const isPublic = computed(() => Boolean(route.meta.public))

async function logout(): Promise<void> {
  await session.logout()
}

function onThemeChange(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement))
    return

  const selected = target.value as AppTheme
  if (theme.themes.includes(selected))
    theme.apply(selected)
}
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <header class="sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur">
      <div class="navbar mx-auto max-w-7xl px-4 lg:px-8">
        <div class="flex-1 gap-3">
          <NuxtLink to="/" class="text-lg font-black tracking-tight">
            {{ runtimeConfig.public.appName }}
          </NuxtLink>
          <Badge accent>
            NFZ 6.7.51
          </Badge>
        </div>

        <div class="flex-none gap-2">
          <select
            class="select select-sm select-bordered hidden sm:block"
            :value="theme.current"
            aria-label="Thème"
            @change="onThemeChange"
          >
            <option v-for="item in theme.themes" :key="item" :value="item">
              {{ item }}
            </option>
          </select>

          <template v-if="!isPublic && session.authenticated">
            <Button is="a" ghost sm href="/dashboard">
              Dashboard
            </Button>
            <Button is="a" v-if="session.isAdmin" ghost sm href="/admin">
              Admin
            </Button>
            <Button primary sm @click="logout">
              Déconnexion
            </Button>
          </template>
          <Button is="a" v-else primary sm href="/login">
            Connexion
          </Button>
        </div>
      </div>
    </header>

    <main>
      <slot></slot>
    </main>
  </div>
</template>
