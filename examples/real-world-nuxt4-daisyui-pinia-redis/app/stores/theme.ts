import { acceptHMRUpdate, defineStore } from 'pinia'

export type AppTheme = 'light' | 'dark' | 'corporate' | 'emerald' | 'business' | 'night'

const STORAGE_KEY = 'nfz-daisyui-theme'
const supportedThemes: readonly AppTheme[] = ['light', 'dark', 'corporate', 'emerald', 'business', 'night']

function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && supportedThemes.includes(value as AppTheme)
}

export const useThemeStore = defineStore('theme', () => {
  const current = ref<AppTheme>('light')

  function apply(theme: AppTheme): void {
    current.value = theme
    if (import.meta.client) {
      document.documentElement.dataset.theme = theme
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  function restore(): void {
    if (!import.meta.client)
      return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (isAppTheme(saved)) {
      apply(saved)
      return
    }

    apply(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }

  return {
    current,
    themes: supportedThemes,
    apply,
    restore,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot))
