import type { NfzStudioEdition } from '../utils/studio-editions'

type StudioEditionState = Record<string, any> | null

export function useStudioEdition() {
  const state = useState<StudioEditionState>('studio-edition-context', () => null)
  const pending = useState<boolean>('studio-edition-pending', () => false)

  async function refresh(force = false) {
    if (state.value && !force) return state.value
    pending.value = true
    try {
      state.value = await $fetch('/api/studio/edition')
      return state.value
    }
    finally {
      pending.value = false
    }
  }

  async function applyScenario(edition: NfzStudioEdition) {
    pending.value = true
    try {
      const result = await $fetch('/api/studio/edition/apply', {
        method: 'POST',
        body: { edition },
      })
      state.value = result.context || null
      return result
    }
    finally {
      pending.value = false
    }
  }

  return { state, pending, refresh, applyScenario }
}
