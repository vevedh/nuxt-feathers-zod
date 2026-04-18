import type { Application as FeathersBaseApplication, HookContext as FeathersBaseHookContext, NextFunction } from '@feathersjs/feathers'
import type { NitroApp } from 'nitropack'

export type { NextFunction }

export interface Configuration {
  framework?: 'express' | 'koa'
  websocket?: boolean
}

export interface ServiceTypes {}

export interface ApplicationAddons {
  nitroApp?: NitroApp
}

export type Application = FeathersBaseApplication<ServiceTypes, Configuration> & ApplicationAddons

export type HookContext<S = any> = FeathersBaseHookContext<Application, S>

export type FeathersServerPlugin = Parameters<Application['configure']>['0']

export interface FeathersServerModuleContext {
  nitroApp: NitroApp
  config: Record<string, any>
  transports: Record<string, any>
  server: Record<string, any>
  moduleOptions?: any
}

export type FeathersServerModule = (app: Application, ctx: FeathersServerModuleContext) => void | Promise<void>

export function defineFeathersServerPlugin(def: FeathersServerPlugin): FeathersServerPlugin {
  return def
}

export function defineFeathersServerModule(def: FeathersServerModule): FeathersServerModule {
  return def
}
