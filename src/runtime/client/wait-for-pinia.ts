export async function waitForPinia(nuxtApp: { $pinia?: unknown }): Promise<unknown> {
  if (import.meta.server)
    return nuxtApp.$pinia

  for (let i = 0; i < 40; i++) {
    if (nuxtApp.$pinia)
      return nuxtApp.$pinia

    await new Promise(resolve => window.setTimeout(resolve, i < 5 ? 0 : 25))
  }

  return nuxtApp.$pinia
}
