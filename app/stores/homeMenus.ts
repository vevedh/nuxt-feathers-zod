import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { homeMenusPath } from '../../services/home-menus/home-menus.shared'

function normalizeItems(result: any) {
  return Array.isArray(result) ? result : (result?.data || [])
}

export const useHomeMenusStore = defineStore('nfz-home-menus', () => {
  const service = useService(homeMenusPath as any) as any
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const items = ref<any[]>([])
  const { info, success, error: traceError } = useDashboardTrace()

  const leftMenus = computed(() => items.value.filter(item => item?.side === 'left').sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0)))
  const rightMenus = computed(() => items.value.filter(item => item?.side === 'right').sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0)))

  async function refresh(query: Record<string, any> = { $limit: 100, $sort: { order: 1, createdAt: -1 } }) {
    loading.value = true
    error.value = null
    try {
      info('service', 'home-menus:refresh:start', 'Chargement home-menus via store feathers-pinia', { query })
      const result = await service.find({ query })
      items.value = normalizeItems(result)
      success('service', 'home-menus:refresh:success', 'Chargement home-menus terminé', { count: items.value.length })
      return items.value
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'home-menus:refresh:error', 'Chargement home-menus en erreur', { error: error.value })
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function seedDefaults() {
    saving.value = true
    error.value = null
    try {
      info('service', 'home-menus:seed:start', 'Seed home-menus démarré')
      await service.create([
        { side: 'left', title: 'Accueil', icon: 'home', to: '/', order: 1, visible: true },
        { side: 'left', title: 'Certificats', icon: 'badge', to: '/certificats', order: 2, visible: true },
        { side: 'left', title: 'Utilisateurs', icon: 'group', to: '/users', order: 3, visible: true },
        { side: 'right', title: 'Administration', icon: 'settings', to: '/admin', order: 1, visible: true },
      ])
      await refresh()
      success('service', 'home-menus:seed:success', 'Seed home-menus terminé')
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'home-menus:seed:error', 'Seed home-menus en erreur', { error: error.value })
      throw e
    }
    finally {
      saving.value = false
    }
  }

  async function createItem(payload: Record<string, any>) {
    saving.value = true
    error.value = null
    try {
      info('service', 'home-menus:create:start', 'Création home-menus via store', { payload })
      const created = await service.create(payload)
      await refresh()
      success('service', 'home-menus:create:success', 'Entrée home-menus créée', { id: created?._id || created?.id || null })
      return created
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'home-menus:create:error', 'Création home-menus en erreur', { error: error.value })
      throw e
    }
    finally {
      saving.value = false
    }
  }

  async function patchItem(id: string, payload: Record<string, any>) {
    saving.value = true
    error.value = null
    try {
      info('service', 'home-menus:update:start', 'Mise à jour home-menus via store', { id, payload })
      const updated = await service.patch(id, payload)
      await refresh()
      success('service', 'home-menus:update:success', 'Entrée home-menus mise à jour', { id })
      return updated
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'home-menus:update:error', 'Mise à jour home-menus en erreur', { error: error.value, id })
      throw e
    }
    finally {
      saving.value = false
    }
  }

  async function removeItem(id: string) {
    saving.value = true
    error.value = null
    try {
      info('service', 'home-menus:remove:start', 'Suppression home-menus via store', { id })
      await service.remove(id)
      await refresh()
      success('service', 'home-menus:remove:success', 'Entrée home-menus supprimée', { id })
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'home-menus:remove:error', 'Suppression home-menus en erreur', { error: error.value, id })
      throw e
    }
    finally {
      saving.value = false
    }
  }

  return {
    service,
    loading,
    saving,
    error,
    items,
    leftMenus,
    rightMenus,
    refresh,
    seedDefaults,
    createItem,
    patchItem,
    removeItem,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useHomeMenusStore, import.meta.hot))
