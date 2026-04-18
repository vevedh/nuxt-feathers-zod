<script setup lang="ts">
defineProps<{
  items: Array<Record<string, any>>
  title: string
}>()
</script>

<template>
  <section class="surface-card p-5 md:p-6">
    <div class="mb-4 flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold nfz-title">{{ title }}</h2>
      <div class="text-sm nfz-subtitle">{{ items.length }} entrée(s)</div>
    </div>

    <TransitionGroup name="menu-fade" tag="div" class="grid gap-3">
      <div
        v-for="item in items"
        :key="item._id || item.id || `${item.side}-${item.title}-${item.order}`"
        class="surface-soft group flex items-center justify-between gap-4 px-4 py-3 transition-all duration-250 hover:bg-[var(--nfz-primary-soft)] hover:-translate-y-0.5"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="menu-icon h-10 w-10 flex items-center justify-center rounded-4 transition-transform duration-250 group-hover:scale-110">
            <QIcon :name="item.icon || 'menu'" size="18px" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-medium nfz-title">{{ item.title || item.label }}</div>
            <div class="truncate text-xs nfz-subtitle">{{ item.to || item.path || '—' }}</div>
          </div>
        </div>
        <div class="text-xs nfz-subtitle/90">#{{ item.order ?? '—' }}</div>
      </div>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all .28s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
