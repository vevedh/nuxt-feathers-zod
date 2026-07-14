import type { NuxtModule } from '@nuxt/schema'
import type { ModuleConfig, ModuleOptions } from './dist/runtime/options/index.js'

declare const module: NuxtModule<ModuleOptions>

export default module
export type { ModuleConfig, ModuleOptions }
