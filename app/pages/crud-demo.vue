<script setup lang="ts">
import { storeToRefs } from 'pinia'

const homeMenusStore = useHomeMenusStore()
const { items, loading, saving, error } = storeToRefs(homeMenusStore)
const editingId = ref<string | null>(null)
const form = reactive({ side: 'left', title: '', icon: 'bolt', to: '/demo', order: 10, visible: true })

async function refresh() {
  await homeMenusStore.refresh({ $limit: 50, $sort: { order: 1, createdAt: -1 } })
}

function startCreate() {
  editingId.value = null
  form.side = 'left'
  form.title = ''
  form.icon = 'bolt'
  form.to = '/demo'
  form.order = items.value.length + 1
  form.visible = true
}

function startEdit(item: any) {
  editingId.value = item._id || item.id || null
  form.side = item.side || 'left'
  form.title = item.title || ''
  form.icon = item.icon || 'bolt'
  form.to = item.to || '/demo'
  form.order = Number(item.order || 0)
  form.visible = item.visible !== false
}

async function save() {
  const payload = {
    side: form.side,
    title: form.title.trim(),
    icon: form.icon.trim(),
    to: form.to.trim(),
    order: Number(form.order || 0),
    visible: !!form.visible,
  }

  if (editingId.value)
    await homeMenusStore.patchItem(editingId.value, payload)
  else
    await homeMenusStore.createItem(payload)

  startCreate()
}

async function removeItem(item: any) {
  const id = item._id || item.id
  if (!id)
    return

  await homeMenusStore.removeItem(id)
  if (editingId.value === id)
    startCreate()
}

onMounted(async () => {
  startCreate()
  await refresh()
})
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="CRUD demo" subtitle="Démo produit pour montrer un service Feathers réel : create, list, patch, remove, avec store Pinia + client feathers-pinia." />

    <div class="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section class="dash-panel">
        <div class="dash-kicker">Édition</div>
        <h2 class="mt-2 dash-title">{{ editingId ? 'Modifier' : 'Créer' }} une entrée home-menus</h2>
        <QForm class="mt-4 grid gap-3" @submit.prevent="save">
          <QSelect v-model="form.side" outlined label="Side" :options="['left', 'right']" />
          <QInput v-model="form.title" outlined label="Title" />
          <QInput v-model="form.icon" outlined label="Icon" />
          <QInput v-model="form.to" outlined label="Route / to" />
          <QInput v-model.number="form.order" outlined type="number" label="Order" />
          <QToggle v-model="form.visible" label="Visible" />
          <div v-if="error" class="rounded-4 border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm text-red-1">{{ error }}</div>
          <div class="flex flex-wrap gap-3">
            <QBtn type="submit" color="primary" unelevated icon="save" :label="editingId ? 'Sauver' : 'Créer'" :loading="saving" />
            <QBtn color="secondary" outline icon="add" label="Nouveau" @click="startCreate" />
            <QBtn color="grey-7" flat icon="refresh" label="Rafraîchir" :loading="loading" @click="refresh" />
          </div>
        </QForm>
      </section>

      <section class="dash-panel">
        <div class="dash-section-head">
          <div>
            <div class="dash-kicker">Résultats</div>
            <h2 class="mt-2 dash-title">Entrées du service</h2>
          </div>
          <QBadge color="primary">{{ items.length }} item(s)</QBadge>
        </div>

        <div class="dash-stack mt-4">
          <div v-for="item in items" :key="item._id || item.id || `${item.side}-${item.title}-${item.order}`" class="dash-list-item">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="font-semibold nfz-title">{{ item.title }}</div>
                <div class="mt-1 text-xs nfz-subtitle">{{ item.to }} · {{ item.side }} · #{{ item.order }}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <QBtn size="sm" color="secondary" flat icon="edit" label="Éditer" @click="startEdit(item)" />
                <QBtn size="sm" color="negative" flat icon="delete" label="Supprimer" @click="removeItem(item)" />
              </div>
            </div>
          </div>
          <div v-if="!items.length" class="dash-soft-panel px-4 py-4 text-sm nfz-subtitle">Aucune entrée disponible.</div>
        </div>
      </section>
    </div>
  </QPage>
</template>
