import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'

const surfaceSoft = [
  'rounded-2xl',
  'border border-slate-200/75',
  'bg-white/90 p-5 shadow-sm',
  'dark:border-slate-800 dark:bg-slate-900/80',
].join(' ')

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.1,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      brand: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#2563eb',
        600: '#1d4ed8',
        700: '#1e40af',
      },
      tealx: {
        500: '#0f766e',
        600: '#0d9488',
      },
      slatex: {
        50: '#f8fafc',
        100: '#f1f5f9',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
      },
    },
  },
  shortcuts: {
    'nfz-page': 'min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100',
    'nfz-card': 'rounded-2xl border border-slate-200/75 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80',
    'nfz-panel': surfaceSoft,
    'nfz-muted': 'text-slate-500 dark:text-slate-400',
    'nfz-gradient': 'bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900',
    'nfz-focus': 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950',
  },
})
