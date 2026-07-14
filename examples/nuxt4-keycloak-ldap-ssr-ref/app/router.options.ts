import type { RouterConfig } from '@nuxt/schema'

function isOauthCallbackHash(hash: string): boolean {
  return hash.includes('state=') && hash.includes('code=')
}

export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    // Keycloak renvoie parfois le code OAuth2 dans le hash :
    // #state=...&session_state=...&code=...
    // Vue Router tente alors de l'utiliser comme sélecteur CSS, ce qui produit
    // le warning "The selector '#state=...' is invalid". On neutralise ce hash.
    if (to.hash && isOauthCallbackHash(to.hash)) {
      return { top: 0 }
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    return { top: 0 }
  },
}
