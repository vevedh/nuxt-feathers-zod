<script setup lang="ts">
import { ref } from 'vue'
const previewSelect = ref('A')
const { state, presets, applyPreset, resetTheme, exportCss } = useNfzThemeBuilder()
const copied = ref(false)
const previewSearch = ref('')

async function copyCss() {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(exportCss.value)
  copied.value = true
  setTimeout(() => copied.value = false, 1400)
}
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="Theme Builder" subtitle="Inspiré du Theme Builder QuasarUI : presets, couleurs de marque, surfaces et export des variables CSS du design system NFZ." />

    <div class="dash-shell-grid">
      <section class="dash-panel dash-stack">
        <div>
          <div class="dash-kicker">Presets</div>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <QBtn v-for="preset in presets" :key="preset.id" unelevated no-caps :color="state.preset === preset.id ? 'primary' : 'grey-3'" :text-color="state.preset === preset.id ? 'white' : 'dark'" :label="preset.label" @click="applyPreset(preset.id)" />
          </div>
        </div>

        <QToggle v-model="state.mode" true-value="dark" false-value="light" checked-icon="dark_mode" unchecked-icon="light_mode" color="primary" label="Mode sombre" />

        <QInput v-model.number="state.radius" type="number" outlined label="Rayon global" min="8" max="40" />

        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1 text-sm"><span>Primary</span><input v-model="state.primary" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
          <label class="grid gap-1 text-sm"><span>Secondary</span><input v-model="state.secondary" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
          <label class="grid gap-1 text-sm"><span>Accent</span><input v-model="state.accent" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
          <label class="grid gap-1 text-sm"><span>Text</span><input v-model="state.text" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
          <label class="grid gap-1 text-sm"><span>Surface</span><input v-model="state.surface" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
          <label class="grid gap-1 text-sm"><span>Surface soft</span><input v-model="state.surfaceSoft" type="color" class="h-10 w-full rounded border border-[var(--nfz-border)] bg-transparent" /></label>
        </div>

        <div class="flex flex-wrap gap-2">
          <QBtn unelevated color="primary" label="Copier CSS" icon="content_copy" @click="copyCss" />
          <QBtn flat color="primary" label="Réinitialiser" icon="restart_alt" @click="resetTheme" />
          <span v-if="copied" class="self-center text-sm text-[var(--nfz-primary)]">Copié</span>
        </div>
      </section>

      <section class="dash-stack">
        <div class="dash-panel dash-preview-grid">
          <div class="dash-soft-panel">
            <div class="text-lg font-semibold">Boutons</div>
            <div class="mt-4 flex flex-wrap gap-2"><QBtn color="primary" label="Primary" unelevated /><QBtn color="secondary" label="Secondary" unelevated /><QBtn outline color="primary" label="Outline" /></div>
          </div>
          <div class="dash-soft-panel">
            <div class="text-lg font-semibold">Badges</div>
            <div class="mt-4 flex flex-wrap gap-2"><QBadge color="primary">Primary</QBadge><QBadge color="secondary">Secondary</QBadge><QBadge color="accent">Accent</QBadge></div>
          </div>
          <div class="dash-soft-panel">
            <div class="text-lg font-semibold">Inputs</div>
            <div class="mt-4 grid gap-3"><QInput v-model="previewSearch" outlined label="Recherche" /><QBtnToggle v-model="previewSelect" unelevated toggle-color="primary" color="grey-3" text-color="dark" :options="[{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }]" /></div>
          </div>
        </div>

        <div class="dash-panel">
          <div class="text-lg font-semibold mb-3">Export CSS</div>
          <pre class="dash-code-block">{{ exportCss }}</pre>
        </div>
      </section>
    </div>
  </QPage>
</template>
