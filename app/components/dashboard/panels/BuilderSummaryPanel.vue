<script setup lang="ts">
defineProps<{
  title?: string
  kicker?: string
  copy?: string
}>()
</script>

<template>
  <section class="grid items-start gap-4 2xl:grid-cols-[minmax(320px,0.74fr),minmax(0,1.26fr)]">
    <div class="grid min-w-0 gap-4">
      <slot name="fields">
        <div class="builder-card p-4">
          <div class="builder-kicker">{{ kicker || 'Schema builder' }}</div>
          <h2 class="mt-1 builder-heading">{{ title || 'Champs' }}</h2>
          <div class="builder-copy">{{ copy || 'Édition rapide des champs avec aperçu immédiat du schéma généré.' }}</div>
        </div>
      </slot>
    </div>
    <div class="grid min-w-0 gap-3 content-start">
      <slot name="summary" />
    </div>
  </section>
</template>
