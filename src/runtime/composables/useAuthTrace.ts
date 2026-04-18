import { computed } from 'vue'
import { useAuthRuntime } from './useAuthRuntime'

export function useAuthTrace() {
  const auth = useAuthRuntime()

  return computed(() => ({
    count: auth.events.value.length,
    latest: auth.events.value[0] || null,
    items: auth.events.value,
  }))
}
