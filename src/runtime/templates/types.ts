import type { NuxtTemplate } from 'nuxt/schema'
import type { ModuleConfig } from '../options'

export type GetContentsType = Required<NuxtTemplate<ModuleConfig>>['getContents']

export type GetContentsDataType = Parameters<GetContentsType>[0]

export type Template = Required<Pick<NuxtTemplate, 'filename' | 'getContents' | 'write'>>

export type Templates = Array<Template>
