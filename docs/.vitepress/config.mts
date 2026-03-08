import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

function withInternalGuide(items: Array<{ text: string; link: string }>) {
  if (!isProd) return items
  return items.filter((item) => !['/guide/open-core', '/guide/playground', '/en/guide/open-core', '/en/guide/playground'].includes(item.link))
}

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
          { text: 'Référence', link: '/reference/' },
          { text: 'CLI', link: '/guide/cli' },
          { text: 'Keycloak SSO', link: '/guide/keycloak-sso' },
          { text: 'Dépannage', link: '/guide/troubleshooting' },
        ],

        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: withInternalGuide([
                { text: 'Démarrage rapide', link: '/guide/getting-started' },
                { text: 'Socle open source standard', link: '/guide/open-core' },
                { text: 'Open core vs Pro', link: '/guide/open-core-vs-pro' },
                { text: 'Politique de support', link: '/guide/support-policy' },
                { text: 'Matrice de compatibilité', link: '/guide/compatibility-matrix' },
                { text: 'Limites connues', link: '/guide/known-limits' },
                { text: 'Modes (embedded/remote)', link: '/guide/modes' },
                { text: 'Mode remote', link: '/guide/remote' },
                { text: 'Playground (tests)', link: '/guide/playground' },
                { text: 'Services (Zod-first)', link: '/guide/services' },
                { text: 'Services manuels', link: '/guide/manual-service' },
                { text: 'Services avec méthodes custom', link: '/guide/custom-services' },
                { text: 'Utilisation frontend (useService, Pinia)', link: '/guide/frontend' },
                { text: 'Auth locale (JWT)', link: '/guide/auth-local' },
                { text: 'Keycloak SSO (Keycloak-only)', link: '/guide/keycloak-sso' },
                { text: 'Swagger (legacy)', link: '/guide/swagger' },
                { text: 'Overrides des templates', link: '/guide/template-overrides' },
                { text: 'Dépannage', link: '/guide/troubleshooting' },
              ]),
            },
          ],
          '/reference/': [
            {
              text: 'Référence',
              items: [
                { text: "Vue d'ensemble", link: '/reference/' },
                { text: 'Architecture', link: '/reference/architecture' },
                { text: 'Architecture du module', link: '/reference/module' },
                { text: 'Configuration', link: '/reference/configuration' },
                { text: 'Options', link: '/reference/options' },
                { text: 'CLI', link: '/reference/cli' },
                { text: 'API runtime', link: '/reference/runtime' },
                { text: 'Mode embedded', link: '/reference/embedded' },
                { text: 'Mode remote', link: '/reference/remote' },
                { text: 'Services', link: '/reference/services' },
                { text: 'Middleware', link: '/reference/middleware' },
                { text: 'Authentification', link: '/reference/authentication' },
                { text: 'Templates', link: '/reference/templates' },
                { text: 'Server modules', link: '/reference/server-modules' },
                { text: 'Doctor', link: '/reference/doctor' },
                { text: 'Dépannage', link: '/reference/troubleshooting' },
                { text: 'RuntimeConfig', link: '/reference/runtime-config' },
                { text: 'Conventions', link: '/reference/conventions' },
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
          { text: 'Reference', link: '/en/reference/' },
          { text: 'CLI', link: '/en/guide/cli' },
          { text: 'Keycloak SSO', link: '/en/guide/keycloak-sso' },
          { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
        ],

        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: withInternalGuide([
                { text: 'Quick start', link: '/en/guide/getting-started' },
                { text: 'Open source core', link: '/en/guide/open-core' },
                { text: 'Open core vs Pro', link: '/en/guide/open-core-vs-pro' },
                { text: 'Support policy', link: '/en/guide/support-policy' },
                { text: 'Compatibility matrix', link: '/en/guide/compatibility-matrix' },
                { text: 'Known limits', link: '/en/guide/known-limits' },
                { text: 'Modes (embedded/remote)', link: '/en/guide/modes' },
                { text: 'Remote mode', link: '/en/guide/remote' },
                { text: 'Playground (tests)', link: '/en/guide/playground' },
                { text: 'Services (Zod-first)', link: '/en/guide/services' },
                { text: 'Manual services', link: '/en/guide/manual-service' },
                { text: 'Adapter-less services', link: '/en/guide/custom-services' },
                { text: 'Frontend usage (useService, Pinia)', link: '/en/guide/frontend' },
                { text: 'Local auth (JWT)', link: '/en/guide/auth-local' },
                { text: 'Keycloak SSO (Keycloak-only)', link: '/en/guide/keycloak-sso' },
                { text: 'Swagger (legacy)', link: '/en/guide/swagger' },
                { text: 'Template overrides', link: '/en/guide/template-overrides' },
                { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
              ]),
            },
          ],
          '/en/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Overview', link: '/en/reference/' },
                { text: 'Architecture', link: '/en/reference/architecture' },
                { text: 'Module architecture', link: '/en/reference/module' },
                { text: 'Configuration', link: '/en/reference/configuration' },
                { text: 'Options', link: '/en/reference/options' },
                { text: 'CLI', link: '/en/reference/cli' },
                { text: 'Runtime API', link: '/en/reference/runtime' },
                { text: 'Embedded mode', link: '/en/reference/embedded' },
                { text: 'Remote mode', link: '/en/reference/remote' },
                { text: 'Services', link: '/en/reference/services' },
                { text: 'Middleware', link: '/en/reference/middleware' },
                { text: 'Authentication', link: '/en/reference/authentication' },
                { text: 'Templates', link: '/en/reference/templates' },
                { text: 'Server modules', link: '/en/reference/server-modules' },
                { text: 'Doctor', link: '/en/reference/doctor' },
                { text: 'Troubleshooting', link: '/en/reference/troubleshooting' },
                { text: 'RuntimeConfig', link: '/en/reference/runtime-config' },
                { text: 'Conventions', link: '/en/reference/conventions' },
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
          text: 'Edit this page',
        },

        footer: {
          message: 'nuxt-feathers-zod module documentation',
          copyright: 'MIT',
        },

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
    localeLinks: {
      text: 'Language',
      items: [
        { text: 'Français', link: '/' },
        { text: 'English', link: '/en/' },
      ],
    },
  },
})
