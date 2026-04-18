<script setup lang="ts">
const request = reactive({ commonName: '', template: 'User' })
const submitting = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)
const { $api } = useNuxtApp()
const api = $api as any

async function submit() {
  submitting.value = true
  error.value = null
  try {
    result.value = await api.service('api/v1/adcs-certificates').create({
      commonName: request.commonName,
      template: request.template
    })
  }
  catch (e: any) {
    error.value = e?.message || String(e)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <QPage class="grid gap-6">
    <AppHeroCard title="Espace certificats" subtitle="Première UI de test pour le service ADCS migré, avec carte de saisie locale et retour brut." />
    <section class="surface-card p-6">
      <QForm class="grid gap-4 md:max-w-xl" @submit.prevent="submit">
        <QInput v-model="request.commonName" standout="bg-white/5 nfz-title" dark label="Common Name" />
        <QInput v-model="request.template" standout="bg-white/5 nfz-title" dark label="Template" />
        <div class="flex items-center gap-3">
          <QBtn type="submit" color="primary" unelevated icon="send" label="Tester ADCS" :loading="submitting" />
          <div v-if="error" class="text-sm text-red-1">{{ error }}</div>
        </div>
      </QForm>
    </section>
    <section class="surface-card p-6 text-sm nfz-subtitle">
      <div class="font-semibold nfz-title mb-3">Résultat brut</div>
      <pre class="overflow-auto whitespace-pre-wrap">{{ result || 'Aucun résultat pour le moment.' }}</pre>
    </section>
  </QPage>
</template>
