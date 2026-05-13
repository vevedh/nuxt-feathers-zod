<script setup lang="ts">
const leftDrawerOpen = ref(false)
const current = useCurrentLdapUser()

const essentialLinks = computed(() => [
  {
    title: 'Accueil',
    caption: 'Dashboard',
    icon: 'dashboard',
    to: '/',
    visible: true,
  },
  {
    title: 'Profil LDAP',
    caption: 'Informations annuaire',
    icon: 'person',
    to: '/profil',
    visible: true,
  },
  {
    title: 'Debug SSO/LDAP',
    caption: 'Contrôle technique',
    icon: 'bug_report',
    to: '/debug/keycloak-ldap',
    visible: current.isDsi.value || current.isAdmin.value,
  },
].filter(link => link.visible))

function toggleLeftDrawer(): void {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<template>
  <QLayout view="lHh Lpr lFf">
    <QHeader elevated class="bg-primary text-white">
      <QToolbar>
        <QBtn
          flat
          round
          dense
          icon="menu"
          @click="toggleLeftDrawer"
        />

        <QToolbarTitle>
          Portail LDAP Remote
        </QToolbarTitle>

        <QBtn
          v-if="current.user.value"
          dense
          flat
          no-caps
          to="/profil"
        >
          <QAvatar size="32px" color="secondary" text-color="white" class="q-mr-sm">
            {{ current.initials.value }}
          </QAvatar>

          {{ current.displayName.value }}
        </QBtn>

        <QBtn
          v-else
          dense
          flat
          no-caps
          icon="login"
          label="Connexion"
          @click="current.login"
        />
      </QToolbar>
    </QHeader>

    <QDrawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <QList>
        <QItemLabel header>
          Navigation
        </QItemLabel>

        <QItem
          v-for="link in essentialLinks"
          :key="link.to"
          clickable
          :to="link.to"
        >
          <QItemSection avatar>
            <QIcon :name="link.icon" />
          </QItemSection>

          <QItemSection>
            <QItemLabel>{{ link.title }}</QItemLabel>
            <QItemLabel caption>
              {{ link.caption }}
            </QItemLabel>
          </QItemSection>
        </QItem>
      </QList>
    </QDrawer>

    <QPageContainer>
      <slot />
    </QPageContainer>
  </QLayout>
</template>
