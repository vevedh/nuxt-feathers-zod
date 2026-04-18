<script setup lang="ts">
withDefaults(defineProps<{
  kicker?: string
  title: string
  copy?: string
  dense?: boolean
  flat?: boolean
  noSeparator?: boolean
}>(), {
  kicker: '',
  copy: '',
  dense: false,
  flat: false,
  noSeparator: false,
})
</script>

<template>
  <QCard :flat="flat" :bordered="!flat" :class="dense ? 'dash-panel p-4 md:p-5' : 'dash-panel'">
    <QCardSection class="pb-3 md:pb-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0 flex-1">
          <div v-if="kicker" class="dash-kicker">{{ kicker }}</div>
          <h2 :class="dense ? 'text-lg md:text-xl font-800 nfz-title leading-tight mt-1' : 'dash-title mt-1'">{{ title }}</h2>
          <p v-if="copy" class="dash-copy mt-2 max-w-4xl">{{ copy }}</p>
        </div>
        <div v-if="$slots.actions" class="w-full xl:w-auto">
          <div class="flex flex-wrap items-center gap-2 xl:justify-end">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </QCardSection>
    <QSeparator v-if="!noSeparator" class="mx-5 md:mx-6" />
    <QCardSection :class="dense ? 'pt-4' : 'pt-5'">
      <slot />
    </QCardSection>
  </QCard>
</template>
