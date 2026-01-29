import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/nuxt-feathers-zod/',  
  lang: 'fr-FR',
  title: ' ',
  description: 'FeathersJS v5 + Zod + Nuxt 4 (Nitro) — module tout-en-un avec CLI',

  // Keep it clean and fast
  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    // We render the branded title (plume light/dark + gradient) via a custom Layout slot.
    // (Default logo/title are hidden by CSS in the theme.)

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Référence', link: '/reference/config' },
      { text: 'CLI', link: '/guide/cli' },
      { text: 'Keycloak SSO', link: '/guide/keycloak-sso' },
      { text: 'Dépannage', link: '/guide/troubleshooting' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Démarrage rapide', link: '/guide/getting-started' },
            { text: 'Services (Zod-first)', link: '/guide/services' },
            { text: 'Utilisation frontend (useService, Pinia)', link: '/guide/frontend' },
            { text: 'Auth locale (JWT)', link: '/guide/auth-local' },
            { text: 'Keycloak SSO (Keycloak-only)', link: '/guide/keycloak-sso' },
            { text: 'Swagger (legacy)', link: '/guide/swagger' },
            { text: 'Dépannage', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Référence',
          items: [
            { text: 'Configuration Nuxt', link: '/reference/config' },
            { text: 'RuntimeConfig', link: '/reference/runtime-config' },
            { text: 'Conventions de génération', link: '/reference/conventions' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/<your-org>/nuxt-feathers-zod' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/<your-org>/nuxt-feathers-zod/edit/main/docs/:path',
      text: 'Modifier cette page',
    },

    footer: {
      message: 'Documentation du module nuxt-feathers-zod',
      copyright: 'MIT',
    },
  },
})
