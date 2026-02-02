import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/nuxt-feathers-zod/',
  cleanUrls: true,
  lastUpdated: true,

  locales: {
    root: {
      label: 'Français',
      lang: 'fr-FR',
      title: ' ',
      description: 'FeathersJS v5 + Zod + Nuxt 4 (Nitro) — module tout-en-un avec CLI',
      themeConfig: {
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
                { text: 'Services manuels', link: '/guide/manual-service' },
                { text: 'Custom services', link: '/guide/custom-services' },
                //{ text: 'Service custom (action)', link: '/guide/custom-service-action' },
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
          { icon: 'npm', link: 'https://www.npmjs.com/package/nuxt-feathers-zod' },
        ],

        search: { provider: 'local' },

        editLink: {
          pattern: 'https://github.com/vevedh/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Modifier cette page',
        },

        footer: {
          message: 'Documentation du module nuxt-feathers-zod',
          copyright: 'MIT',
        },

        // UI labels (FR)
        outline: { label: 'Sur cette page' },
        docFooter: { prev: 'Page précédente', next: 'Page suivante' },
        lastUpdatedText: 'Mis à jour le',
        returnToTopLabel: 'Retour en haut',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Thème',
        lightModeSwitchTitle: 'Passer en clair',
        darkModeSwitchTitle: 'Passer en sombre',
      },
    },

    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: ' ',
      description: 'FeathersJS v5 + Zod + Nuxt 4 (Nitro) — all-in-one module with CLI',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Reference', link: '/en/reference/config' },
          { text: 'CLI', link: '/en/guide/cli' },
          { text: 'Keycloak SSO', link: '/en/guide/keycloak-sso' },
          { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
                { text: 'Manual services', link: '/en/guide/manual-service' },
                { text: 'Custom services', link: '/en/guide/custom-services' },
        ],

        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Quick start', link: '/en/guide/getting-started' },
                { text: 'Services (Zod-first)', link: '/en/guide/services' },
                //{ text: 'Custom service (action)', link: '/en/guide/custom-service-action' },
                { text: 'Manual services', link: '/en/guide/manual-service' },
                { text: 'Custom services', link: '/en/guide/custom-services' },
                { text: 'Frontend usage (useService, Pinia)', link: '/en/guide/frontend' },
                { text: 'Local auth (JWT)', link: '/en/guide/auth-local' },
                { text: 'Keycloak SSO (Keycloak-only)', link: '/en/guide/keycloak-sso' },
                { text: 'Swagger (legacy)', link: '/en/guide/swagger' },
                { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
              ],
            },
          ],
          '/en/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Nuxt configuration', link: '/en/reference/config' },
                { text: 'RuntimeConfig', link: '/en/reference/runtime-config' },
                { text: 'Generation conventions', link: '/en/reference/conventions' },
              ],
            },
          ],
        },

        socialLinks: [
          { icon: 'npm', link: 'https://www.npmjs.com/package/nuxt-feathers-zod' },
        ],

        search: { provider: 'local' },

        editLink: {
          pattern: 'https://github.com/<your-org>/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Edit this page',
        },

        footer: {
          message: 'nuxt-feathers-zod module documentation',
          copyright: 'MIT',
        },

        // UI labels (EN)
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdatedText: 'Last updated',
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
      },
    },
  },

  themeConfig: {
    // Language switch in navbar
    localeLinks: {
      text: 'Language',
      items: [
        { text: 'Français', link: '/' },
        { text: 'English', link: '/en/' },
      ],
    },
  },
})
