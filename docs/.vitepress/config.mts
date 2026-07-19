import { defineConfig } from 'vitepress'

const githubProjectUrl = 'https://github.com/vevedh/nuxt-feathers-zod'
const npmProjectUrl = 'https://www.npmjs.com/package/nuxt-feathers-zod'

const frGuideSidebar = [
  {
    text: 'Bien démarrer',
    items: [
      { text: 'Démarrage rapide', link: '/guide/getting-started' },
      { text: 'Choisir embedded ou remote', link: '/guide/modes' },
      { text: 'Créer un service', link: '/guide/services' },
      { text: 'Utiliser le client Vue', link: '/guide/frontend' },
    ],
  },
  {
    text: 'Fonctions principales',
    items: [
      { text: 'Authentification', link: '/guide/authentication-providers' },
      { text: 'Auth locale et JWT', link: '/guide/auth-local' },
      { text: 'Keycloak et OIDC', link: '/guide/keycloak-sso' },
      { text: 'MongoDB', link: '/reference/mongodb-management' },
      { text: 'Upload et téléchargement', link: '/guide/file-upload-download' },
    ],
  },
  {
    text: 'Exemples et validation',
    items: [
      { text: 'Playground', link: '/guide/playground' },
      { text: 'Starter Quasar', link: '/guide/starter-quasar-unocss-pinia' },
      { text: 'Application Nuxt + Quasar', link: '/guide/real-world-nuxt4-quasar-app' },
      { text: 'Migrer une application', link: '/guide/migrate-existing-nuxt4-app' },
    ],
  },
  {
    text: 'Production',
    items: [
      { text: 'Déployer en production', link: '/guide/production' },
      { text: 'Compatibilité', link: '/guide/compatibility-matrix' },
      { text: 'Limites connues', link: '/guide/known-limits' },
      { text: 'Dépannage', link: '/guide/troubleshooting' },
    ],
  },
]

const frReferenceSidebar = [
  {
    text: 'Configuration',
    items: [
      { text: 'Vue d’ensemble', link: '/reference/' },
      { text: 'Options du module', link: '/reference/configuration' },
      { text: 'RuntimeConfig', link: '/reference/runtime-config' },
      { text: 'Modes embedded et remote', link: '/reference/embedded' },
    ],
  },
  {
    text: 'API applicative',
    items: [
      { text: 'Services Feathers', link: '/reference/services' },
      { text: 'Client et composables', link: '/reference/runtime' },
      { text: 'Authentification', link: '/reference/authentication' },
      { text: 'Événements', link: '/reference/events' },
    ],
  },
  {
    text: 'Outils',
    items: [
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Doctor', link: '/reference/doctor' },
      { text: 'Templates', link: '/reference/templates' },
      { text: 'Modules serveur', link: '/reference/server-modules' },
      { text: 'Middleware', link: '/reference/middleware' },
    ],
  },
]

const enGuideSidebar = [
  {
    text: 'Get started',
    items: [
      { text: 'Quick start', link: '/en/guide/getting-started' },
      { text: 'Choose embedded or remote', link: '/en/guide/modes' },
      { text: 'Create a service', link: '/en/guide/services' },
      { text: 'Use the Vue client', link: '/en/guide/frontend' },
    ],
  },
  {
    text: 'Core features',
    items: [
      { text: 'Authentication', link: '/en/guide/authentication-providers' },
      { text: 'Local auth and JWT', link: '/en/guide/auth-local' },
      { text: 'Keycloak and OIDC', link: '/en/guide/keycloak-sso' },
      { text: 'MongoDB', link: '/en/reference/mongodb-management' },
      { text: 'File upload and download', link: '/en/guide/file-upload-download' },
    ],
  },
  {
    text: 'Examples and validation',
    items: [
      { text: 'Playground', link: '/en/guide/playground' },
      { text: 'Quasar starter', link: '/en/guide/starter-quasar-unocss-pinia' },
      { text: 'Nuxt + Quasar application', link: '/en/guide/real-world-nuxt4-quasar-app' },
      { text: 'Migrate an application', link: '/en/guide/migrate-existing-nuxt4-app' },
    ],
  },
  {
    text: 'Production',
    items: [
      { text: 'Deploy to production', link: '/en/guide/production' },
      { text: 'Compatibility', link: '/en/guide/compatibility-matrix' },
      { text: 'Known limits', link: '/en/guide/known-limits' },
      { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
    ],
  },
]

const enReferenceSidebar = [
  {
    text: 'Configuration',
    items: [
      { text: 'Overview', link: '/en/reference/' },
      { text: 'Module options', link: '/en/reference/configuration' },
      { text: 'RuntimeConfig', link: '/en/reference/runtime-config' },
      { text: 'Embedded and remote modes', link: '/en/reference/embedded' },
    ],
  },
  {
    text: 'Application API',
    items: [
      { text: 'Feathers services', link: '/en/reference/services' },
      { text: 'Client and composables', link: '/en/reference/runtime' },
      { text: 'Authentication', link: '/en/reference/authentication' },
      { text: 'Events', link: '/en/reference/events' },
    ],
  },
  {
    text: 'Tools',
    items: [
      { text: 'CLI', link: '/en/reference/cli' },
      { text: 'Doctor', link: '/en/reference/doctor' },
      { text: 'Templates', link: '/en/reference/templates' },
      { text: 'Server modules', link: '/en/reference/server-modules' },
      { text: 'Middleware', link: '/en/reference/middleware' },
    ],
  },
]

export default defineConfig({
  base: '/nuxt-feathers-zod/',
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/nuxt-feathers-zod/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }],
  ],
  locales: {
    root: {
      label: 'Français',
      lang: 'fr-FR',
      title: ' ',
      description: 'Nuxt 4, FeathersJS et Zod dans un module full-stack prêt à utiliser',
      themeConfig: {
        nav: [
          { text: 'Démarrer', link: '/guide/getting-started' },
          { text: 'Guides', link: '/guide/services' },
          { text: 'API', link: '/reference/' },
          { text: 'Playground', link: '/guide/playground' },
          { text: 'Production', link: '/guide/production' },
        ],
        sidebar: { '/guide/': frGuideSidebar, '/reference/': frReferenceSidebar },
        socialLinks: [
          { icon: 'github', link: githubProjectUrl, ariaLabel: 'Dépôt GitHub nuxt-feathers-zod' },
          { icon: 'npm', link: npmProjectUrl, ariaLabel: 'Package npm nuxt-feathers-zod' },
        ],
        search: { provider: 'local' },
        editLink: {
          pattern: 'https://github.com/vevedh/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Améliorer cette page',
        },
        footer: { message: 'Documentation utilisateur de nuxt-feathers-zod', copyright: 'Licence MIT' },
        outline: { label: 'Sur cette page' },
        docFooter: { prev: 'Page précédente', next: 'Page suivante' },
        lastUpdatedText: 'Mis à jour le',
        returnToTopLabel: 'Retour en haut',
        sidebarMenuLabel: 'Menu',
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: ' ',
      description: 'Nuxt 4, FeathersJS and Zod in a ready-to-use full-stack module',
      themeConfig: {
        nav: [
          { text: 'Get started', link: '/en/guide/getting-started' },
          { text: 'Guides', link: '/en/guide/services' },
          { text: 'API', link: '/en/reference/' },
          { text: 'Playground', link: '/en/guide/playground' },
          { text: 'Production', link: '/en/guide/production' },
        ],
        sidebar: { '/en/guide/': enGuideSidebar, '/en/reference/': enReferenceSidebar },
        socialLinks: [
          { icon: 'github', link: githubProjectUrl, ariaLabel: 'nuxt-feathers-zod GitHub repository' },
          { icon: 'npm', link: npmProjectUrl, ariaLabel: 'nuxt-feathers-zod npm package' },
        ],
        search: { provider: 'local' },
        editLink: {
          pattern: 'https://github.com/vevedh/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Improve this page',
        },
        footer: { message: 'nuxt-feathers-zod user documentation', copyright: 'MIT License' },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdatedText: 'Last updated',
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
      },
    },
  },
  themeConfig: { logo: '/images/nfz-feather.webp' },
})
