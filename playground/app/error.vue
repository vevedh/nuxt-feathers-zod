<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

const message = computed(() => props.error.statusMessage || props.error.message || 'Une erreur empêche l’affichage de cette page.')

function returnHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="nfz-playground">
    <main class="nfz-main" style="margin-left:0">
      <div class="nfz-main__inner">
        <div class="nfz-page" style="max-width:760px;margin:8vh auto 0">
          <PlaygroundPageHeader
            eyebrow="Erreur du playground"
            :title="`Erreur ${error.statusCode || 500}`"
            :description="message"
          />
          <PlaygroundPanel title="Revenir à un état connu">
            <div class="nfz-actions">
              <button class="nfz-button nfz-button--primary" type="button" @click="returnHome">Retour au tableau de bord</button>
              <button class="nfz-button" type="button" @click="reloadNuxtApp()">Recharger l’application</button>
            </div>
          </PlaygroundPanel>
        </div>
      </div>
    </main>
  </div>
</template>
