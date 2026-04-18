import { computed, watch } from "vue"

type ThemePreset = {
  id: string
  label: string
  primary: string
  secondary: string
  accent: string
  surface: string
  surfaceSoft: string
  text: string
  muted: string
}

type ThemeState = {
  mode: 'light' | 'dark'
  preset: string
  primary: string
  secondary: string
  accent: string
  surface: string
  surfaceSoft: string
  text: string
  muted: string
  radius: number
}

const PRESETS: ThemePreset[] = [
  { id: 'portal', label: 'Portal', primary: '#0f766e', secondary: '#0ea5e9', accent: '#22c55e', surface: '#ffffff', surfaceSoft: '#f8fafc', text: '#1f2937', muted: '#64748b' },
  { id: 'ocean', label: 'Ocean', primary: '#0284c7', secondary: '#06b6d4', accent: '#14b8a6', surface: '#ffffff', surfaceSoft: '#eff6ff', text: '#0f172a', muted: '#475569' },
  { id: 'emerald', label: 'Emerald', primary: '#059669', secondary: '#10b981', accent: '#84cc16', surface: '#ffffff', surfaceSoft: '#f0fdf4', text: '#1f2937', muted: '#4b5563' },
  { id: 'violet', label: 'Violet', primary: '#7c3aed', secondary: '#8b5cf6', accent: '#ec4899', surface: '#ffffff', surfaceSoft: '#faf5ff', text: '#1f2937', muted: '#6b7280' },
]

function storageKey() { return 'nfz-theme-builder-v1' }

function loadState(): ThemeState {
  const defaultBase = PRESETS[0] || { id: 'portal', label: 'Portal', primary: '#0f766e', secondary: '#0ea5e9', accent: '#22c55e', surface: '#ffffff', surfaceSoft: '#f8fafc', text: '#1f2937', muted: '#64748b' }
  if (!import.meta.client) {
    const base = defaultBase
    return { mode: 'light', preset: base.id, primary: base.primary, secondary: base.secondary, accent: base.accent, surface: base.surface, surfaceSoft: base.surfaceSoft, text: base.text, muted: base.muted, radius: 24 }
  }
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  const base = defaultBase
  return { mode: 'light', preset: base.id, primary: base.primary, secondary: base.secondary, accent: base.accent, surface: base.surface, surfaceSoft: base.surfaceSoft, text: base.text, muted: base.muted, radius: 24 }
}

export function useNfzThemeBuilder() {
  const state = useState<ThemeState>('nfz-theme-builder-state', loadState)
  const presets = PRESETS

  function applyCssVars() {
    if (!import.meta.client) return
    const el = document.documentElement
    el.style.setProperty('--nfz-primary', state.value.primary)
    el.style.setProperty('--nfz-secondary', state.value.secondary)
    el.style.setProperty('--nfz-accent', state.value.accent)
    el.style.setProperty('--nfz-surface', state.value.surface)
    el.style.setProperty('--nfz-surface-soft', state.value.surfaceSoft)
    el.style.setProperty('--nfz-text', state.value.text)
    el.style.setProperty('--nfz-muted', state.value.muted)
    el.style.setProperty('--nfz-radius', `${state.value.radius}px`)
    el.style.setProperty('--nfz-primary-soft', `${state.value.primary}14`)
  }

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(storageKey(), JSON.stringify(state.value))
  }

  function applyPreset(id: string) {
    const preset = presets.find(p => p.id === id)
    if (!preset) return
    state.value = { ...state.value, preset: id, primary: preset.primary, secondary: preset.secondary, accent: preset.accent, surface: preset.surface, surfaceSoft: preset.surfaceSoft, text: preset.text, muted: preset.muted }
    applyCssVars(); persist()
  }

  function resetTheme() { applyPreset('portal'); state.value.radius = 24; applyCssVars(); persist() }

  const exportCss = computed(() => `:root {
  --nfz-primary: ${state.value.primary};
  --nfz-secondary: ${state.value.secondary};
  --nfz-accent: ${state.value.accent};
  --nfz-surface: ${state.value.surface};
  --nfz-surface-soft: ${state.value.surfaceSoft};
  --nfz-text: ${state.value.text};
  --nfz-muted: ${state.value.muted};
  --nfz-radius: ${state.value.radius}px;
}`)

  watch(state, () => { applyCssVars(); persist() }, { deep: true })

  return { state, presets, applyPreset, resetTheme, applyCssVars, exportCss }
}
