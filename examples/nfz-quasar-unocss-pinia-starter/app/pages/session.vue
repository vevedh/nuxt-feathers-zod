<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})

const session = useStudioSessionStore()
const authorizationHeader = ref<string | null>(null)

async function refreshHeader(): Promise<void> {
  authorizationHeader.value = await session.getAuthorizationHeader()
}

onMounted(refreshHeader)
</script>

<template>
  <div class="grid gap-6">
    <section>
      <h1 class="text-3xl font-800">
        Session
      </h1>
      <p class="mt-1 nfz-muted">
        Diagnostic applicatif sans exposer les détails runtime dans les pages métier.
      </p>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <QCard class="nfz-card">
        <QCardSection>
          <div class="text-sm nfz-muted">
            Utilisateur
          </div>
          <pre class="mt-3 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{{ session.user }}</pre>
        </QCardSection>
      </QCard>

      <QCard class="nfz-card">
        <QCardSection>
          <div class="text-sm nfz-muted">
            Rôles
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <QChip v-for="role in session.roles" :key="role" color="primary" text-color="white">
              {{ role }}
            </QChip>
          </div>
        </QCardSection>
      </QCard>
    </section>

    <QCard class="nfz-card">
      <QCardSection>
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="font-800">
              Authorization header
            </div>
            <div class="nfz-muted text-sm">
              Résolu par le store session, pas par la page.
            </div>
          </div>
          <QBtn :ripple="false" flat color="primary" icon="refresh" label="Actualiser" @click="refreshHeader" />
        </div>
        <pre class="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{{ authorizationHeader }}</pre>
      </QCardSection>
    </QCard>
  </div>
</template>
