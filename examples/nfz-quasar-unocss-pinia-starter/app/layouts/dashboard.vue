<script setup lang="ts">
const session = useStudioSessionStore()
const {
  drawerOpen,
  drawerOverlay,
  drawerBehavior,
  toggleDrawer,
  closeDrawerOnMobile,
} = useDrawerSafeState()

const navItems = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    to: '/dashboard',
  },
  {
    label: 'Messages',
    icon: 'forum',
    to: '/messages',
  },
  {
    label: 'Session',
    icon: 'verified_user',
    to: '/session',
  },
]
</script>

<template>
  <QLayout view="hHh Lpr lff" class="nfz-shell nfz-drawer-backdrop-safe">
    <QHeader bordered class="bg-white/85 text-slate-900 backdrop-blur dark:bg-slate-950/85 dark:text-slate-100">
      <QToolbar class="min-h-16 px-4">
        <QBtn flat dense round :ripple="false" icon="menu" aria-label="Menu" @click="toggleDrawer" />

        <QToolbarTitle class="flex items-center gap-3">
          <div class="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            NFZ
          </div>
          <div class="leading-tight">
            <div class="text-base font-700">
              NFZ Starter
            </div>
            <div class="text-xs nfz-muted">
              Nuxt 4 · Quasar · UnoCSS · Pinia
            </div>
          </div>
        </QToolbarTitle>

        <div class="hidden items-center gap-2 md:flex">
          <QChip dense square color="primary" text-color="white" icon="lock">
            {{ session.userLabel }}
          </QChip>
          <QBtn flat dense :ripple="false" icon="logout" label="Déconnexion" @click="session.logout" />
        </div>

        <QBtn class="md:hidden" flat dense round :ripple="false" icon="logout" @click="session.logout" />
      </QToolbar>
    </QHeader>

    <QDrawer
      v-model="drawerOpen"
      :behavior="drawerBehavior"
      :breakpoint="1024"
      :overlay="drawerOverlay"
      show-if-above
      bordered
      :width="280"
      class="nfz-sidebar"
    >
      <QScrollArea class="fit">
        <div class="p-4">
          <div class="nfz-card rounded-2xl p-4 dark:bg-slate-900/60">
            <div class="text-xs uppercase tracking-wide nfz-muted">
              Session active
            </div>
            <div class="mt-1 font-700">
              {{ session.userLabel }}
            </div>
            <div class="mt-3 flex flex-wrap gap-1">
              <QBadge
                v-for="role in session.roles"
                :key="role"
                rounded
                color="primary"
                outline
              >
                {{ role }}
              </QBadge>
            </div>
          </div>
        </div>

        <QList padding>
          <QItem
            v-for="item in navItems"
            :key="item.to"
            clickable
            :ripple="false"
            exact
            :to="item.to"
            class="nfz-nav-item"
            @click="closeDrawerOnMobile"
          >
            <QItemSection avatar>
              <QIcon :name="item.icon" />
            </QItemSection>
            <QItemSection>{{ item.label }}</QItemSection>
          </QItem>
        </QList>
      </QScrollArea>
    </QDrawer>

    <QPageContainer>
      <QPage class="p-4 md:p-6">
        <slot></slot>
      </QPage>
    </QPageContainer>
  </QLayout>
</template>
