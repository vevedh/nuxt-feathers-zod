import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import { userPath } from '../../services/users/users.shared'

function normalizeItems(result: any) {
  return Array.isArray(result) ? result : (result?.data || [])
}

export const useUsersStore = defineStore('nfz-users', () => {
  const service = useService(userPath as any) as any
  const loading = ref(false)
  const error = ref<string | null>(null)
  const items = ref<any[]>([])
  const { info, success, error: traceError } = useDashboardTrace()

  async function refresh(query: Record<string, any> = { $limit: 20, $sort: { createdAt: -1 } }) {
    loading.value = true
    error.value = null
    try {
      info('service', 'users:refresh:start', 'Chargement users via store feathers-pinia', { query })
      const result = await service.find({ query })
      items.value = normalizeItems(result)
      success('service', 'users:refresh:success', 'Chargement users terminé', { count: items.value.length })
      return items.value
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('service', 'users:refresh:error', 'Chargement users en erreur', { error: error.value })
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    service,
    loading,
    error,
    items,
    refresh,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot))
