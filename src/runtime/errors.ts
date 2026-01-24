export class NuxtFeathersError extends Error {
  constructor(message?: string) {
    super(`[nuxt-feathers-zod]: ${message}`)
  }
}
