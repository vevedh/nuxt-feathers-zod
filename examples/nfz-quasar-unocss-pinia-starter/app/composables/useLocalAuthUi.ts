import type { LoginCredentials } from '~/types/auth'
import { getErrorMessage } from '~/utils/errors'

export interface LocalAuthUiState {
  userId: string
  password: string
  remember: boolean
}

export function useLocalAuthUi() {
  const route = useRoute()
  const session = useStudioSessionStore()

  const form = reactive<LocalAuthUiState>({
    userId: 'admin',
    password: 'admin123',
    remember: true,
  })

  const loading = ref(false)
  const error = ref<string | null>(null)
  const passwordVisible = ref(false)

  const canSubmit = computed(() => {
    return form.userId.trim().length >= 3 && form.password.trim().length >= 6
  })

  function buildCredentials(): LoginCredentials {
    return {
      userId: form.userId.trim(),
      password: form.password,
    }
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value)
      return

    loading.value = true
    error.value = null

    try {
      await session.login(buildCredentials())
      const redirect = typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/dashboard'
      await navigateTo(redirect)
    }
    catch (err) {
      error.value = getErrorMessage(err)
    }
    finally {
      loading.value = false
    }
  }

  return {
    form,
    loading,
    error,
    passwordVisible,
    canSubmit,
    submit,
  }
}
