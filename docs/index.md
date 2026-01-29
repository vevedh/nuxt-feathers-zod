---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod + Nuxt 4 (Nitro)"
  tagline: "Un backend Feathers embarqué dans Nuxt, génération de services Zod-first, client Pinia, Swagger (legacy) et option Keycloak SSO."
  image:
    src: /plume-dark.png
    alt: Logo plume
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Configuration
      link: /reference/config

features:
  - title: "Backend dans Nitro"
    details: "Feathers tourne dans le même runtime que ton Nuxt 4 : pas de backend séparé."
  - title: "Zod-first"
    details: "Schemas Zod générés, validation query/data, types partagés (client/server)."
  - title: "CLI officielle"
    details: "Services/middlewares générés de façon déterministe (ne pas créer manuellement)."
  - title: "Client DX"
    details: "useService + Pinia stores (feathers-pinia) + auth store (optionnel)."
  - title: "Swagger legacy"
    details: "Optionnel via feathers-swagger + swagger-ui-dist (DX au démarrage si manquant)."
  - title: "Keycloak SSO"
    details: "Mode Keycloak-only, SSO silencieux (check-sso) et routes protégées au cas par cas."
---

## TL;DR

- Déclare `feathers.servicesDirs = ['services']`.
- Génère toujours les services via la CLI : `bunx nuxt-feathers-zod add service ...`.
- Si tu actives Keycloak : `auth.provider = 'keycloak'` et protège tes routes avec un middleware.
