export type PresetId = 'mongo+local-auth+users+seed'

export type PresetFieldType = 'string' | 'select' | 'boolean' | 'password'

export type PresetField = {
  key: string
  label: string
  type: PresetFieldType
  required?: boolean
  default?: any
  placeholder?: string
  help?: string
  options?: Array<{ label: string, value: string }>
}

export type PresetDefinition = {
  id: PresetId
  title: string
  description?: string
  fields: PresetField[]
  // CLI preset id (kebab), used when delegating to CLI init
  cliPreset: string
}

export type PresetParams = Record<string, any>

export type PlanStep = { title: string, details: string[] }

export type PresetPlan = {
  ok: true
  preset: PresetId
  command: string[]
  plan: PlanStep[]
  // env mapping for apply
  env: Record<string, string>
  // allow UI to show masked secrets
  masked?: Record<string, string>
}

export type CoreContext = {
  rootDir: string
  allowWrite: boolean
}
