export default {
  scrollBehavior(to: any, from: any, savedPosition: any) {
    if (savedPosition)
      return savedPosition

    const hash = to?.hash || ''
    // After Keycloak redirects, the hash can contain state/session_state/code which is not a valid CSS selector.
    if (hash && /(state=|session_state=|code=)/.test(hash)) {
      return { left: 0, top: 0 }
    }

    if (hash) {
      try {
        const id = hash.startsWith('#') ? hash.slice(1) : hash
        const el = '#' + (globalThis.CSS?.escape ? globalThis.CSS.escape(id) : id)
        return { el }
      }
      catch {
        return { left: 0, top: 0 }
      }
    }

    return { left: 0, top: 0 }
  },
}
