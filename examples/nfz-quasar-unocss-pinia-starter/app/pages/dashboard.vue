<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})

const route = useRoute()
const session = useStudioSessionStore()
const messages = useMessagesStore()

onMounted(async () => {
  await messages.fetchMessages()
})
</script>

<template>
  <div class="grid gap-6">
    <QBanner
      v-if="route.query.forbidden === '1'"
      rounded
      class="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
    >
      Accès refusé : rôle insuffisant pour cette page.
    </QBanner>

    <section class="nfz-gradient rounded-3xl p-6 text-white shadow-lg md:p-8">
      <div class="max-w-3xl">
        <div class="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/20">
          Session Feathers active
        </div>
        <h1 class="text-3xl font-800 md:text-4xl">
          Bonjour {{ session.userLabel }}.
        </h1>
        <p class="mt-3 text-blue-50/80 leading-7">
          Cette page est protégée par le middleware session global.
          Les données métier passent par un store Pinia et une couche d’accès Feathers.
        </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <QCard class="nfz-card nfz-card-hover">
        <QCardSection>
          <div class="flex items-center justify-between">
            <div>
              <div class="nfz-muted text-sm">
                Utilisateur
              </div>
              <div class="mt-1 text-xl font-800">
                {{ session.userLabel }}
              </div>
            </div>
            <QIcon name="person" size="32px" color="primary" />
          </div>
        </QCardSection>
      </QCard>

      <QCard class="nfz-card nfz-card-hover">
        <QCardSection>
          <div class="flex items-center justify-between">
            <div>
              <div class="nfz-muted text-sm">
                Rôles
              </div>
              <div class="mt-1 text-xl font-800">
                {{ session.roles.join(', ') }}
              </div>
            </div>
            <QIcon name="admin_panel_settings" size="32px" color="secondary" />
          </div>
        </QCardSection>
      </QCard>

      <QCard class="nfz-card nfz-card-hover">
        <QCardSection>
          <div class="flex items-center justify-between">
            <div>
              <div class="nfz-muted text-sm">
                Messages
              </div>
              <div class="mt-1 text-xl font-800">
                {{ messages.total }}
              </div>
            </div>
            <QIcon name="forum" size="32px" color="info" />
          </div>
        </QCardSection>
      </QCard>
    </section>

    <section class="nfz-panel">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-800">
            Derniers messages
          </h2>
          <p class="nfz-muted text-sm">
            Service Feathers protégé par JWT.
          </p>
        </div>
        <QBtn :ripple="false" flat color="primary" to="/messages" label="Ouvrir" icon-right="arrow_forward" />
      </div>

      <QList bordered separator class="rounded-xl overflow-hidden">
        <QItem v-for="message in messages.latest" :key="message.id">
          <QItemSection>
            <QItemLabel>{{ message.text }}</QItemLabel>
            <QItemLabel caption>
              {{ message.createdAt }}
            </QItemLabel>
          </QItemSection>
        </QItem>
        <QItem v-if="!messages.latest.length">
          <QItemSection>
            <QItemLabel class="nfz-muted">
              Aucun message pour l’instant.
            </QItemLabel>
          </QItemSection>
        </QItem>
      </QList>
    </section>
  </div>
</template>
