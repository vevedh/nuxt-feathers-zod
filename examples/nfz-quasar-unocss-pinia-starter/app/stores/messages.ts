import { acceptHMRUpdate, defineStore } from 'pinia'
import type { EntityId, MessageRecord } from '~/types/auth'
import { getErrorMessage } from '~/utils/errors'

function getEntityId(item: MessageRecord): EntityId | null {
  return item.id ?? item._id ?? null
}

export const useMessagesStore = defineStore('messages', () => {
  const items = ref<MessageRecord[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const total = computed(() => items.value.length)
  const latest = computed(() => items.value.slice(0, 3))

  async function fetchMessages(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const api = useAdminFeathers()
      items.value = await api.messages.find()
    }
    catch (err) {
      error.value = getErrorMessage(err)
    }
    finally {
      loading.value = false
    }
  }

  async function createMessage(text: string): Promise<void> {
    const cleanText = text.trim()
    if (!cleanText)
      return

    saving.value = true
    error.value = null

    try {
      const api = useAdminFeathers()
      await api.messages.create(cleanText)
      await fetchMessages()
    }
    catch (err) {
      error.value = getErrorMessage(err)
    }
    finally {
      saving.value = false
    }
  }

  async function removeMessage(id: EntityId): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const api = useAdminFeathers()
      await api.messages.remove(id)
      items.value = items.value.filter((item) => {
        return getEntityId(item) !== id
      })
    }
    catch (err) {
      error.value = getErrorMessage(err)
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    latest,
    total,
    loading,
    saving,
    error,
    getEntityId,
    fetchMessages,
    createMessage,
    removeMessage,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useMessagesStore, import.meta.hot))
