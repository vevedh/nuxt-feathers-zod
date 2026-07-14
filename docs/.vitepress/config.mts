import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'
const githubProjectUrl = 'https://github.com/vevedh/nuxt-feathers-zod'
const npmProjectUrl = 'https://www.npmjs.com/package/nuxt-feathers-zod'

const internalGuideLinks = new Set([
  '/guide/open-core',
  '/guide/open-core-vs-pro',
  '/en/guide/open-core',
  '/en/guide/open-core-vs-pro',
])

const internalGuideSrcExclude = [
  'guide/open-core.md',
  'guide/open-core-vs-pro.md',
  'en/guide/open-core.md',
  'en/guide/open-core-vs-pro.md',
]

interface SidebarItem {
  text: string
  link: string
}

function productionVisible(items: SidebarItem[]): SidebarItem[] {
  return isProd ? items.filter(item => !internalGuideLinks.has(item.link)) : items
}

const frGuideSidebar = [
  {
    text: 'Comprendre',
    items: [
      { text: 'Plan de la documentation', link: '/guide/complete-guide' },
      { text: 'Vue d’ensemble', link: '/reference/' },
      { text: 'Architecture', link: '/reference/architecture' },
      { text: 'Modes embedded et remote', link: '/guide/modes' },
    ],
  },
  {
    text: 'Démarrer',
    items: [
      { text: 'Démarrage rapide', link: '/guide/getting-started' },
      { text: 'Services Feathers et Zod', link: '/guide/services' },
      { text: 'Utilisation frontend', link: '/guide/frontend' },
      { text: 'Playground de validation', link: '/guide/playground' },
    ],
  },
  {
    text: 'Authentification',
    items: [
      { text: 'Auth locale JWT', link: '/guide/auth-local' },
      { text: 'Runtime d’authentification', link: '/guide/auth-runtime' },
      { text: 'Keycloak SSO', link: '/guide/keycloak-sso' },
      { text: 'Keycloak + LDAP/AD', link: '/guide/remote-keycloak-ldap' },
      { text: 'Keycloak + LDAP/AD SSR', link: '/guide/remote-keycloak-ldap-ssr' },
    ],
  },
  {
    text: 'Outils du module',
    items: productionVisible([
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Client Builder Feathers', link: '/guide/builder-client' },
      { text: 'Builder playground', link: '/guide/builder-playground' },
      { text: 'MongoDB management', link: '/reference/mongodb-management' },
      { text: 'Upload et téléchargement', link: '/guide/file-upload-download' },
    ]),
  },
  {
    text: 'Exploitation',
    items: [
      { text: 'Mise en production', link: '/guide/production' },
      { text: 'Matrice de compatibilité', link: '/guide/compatibility-matrix' },
      { text: 'Limites connues', link: '/guide/known-limits' },
      { text: 'Dépannage', link: '/guide/troubleshooting' },
      { text: 'Publication npm et Git', link: '/guide/publishing' },
      { text: 'Checklist de release', link: '/guide/release-checklist' },
    ],
  },
  {
    text: 'Guides spécialisés',
    collapsed: true,
    items: productionVisible([
      { text: 'Starter Quasar principal', link: '/guide/starter-quasar-unocss-pinia' },
      { text: 'Application métier Nuxt 4 + Quasar', link: '/guide/real-world-nuxt4-quasar-app' },
      { text: 'Migration d’une application', link: '/guide/migrate-existing-nuxt4-app' },
      { text: 'Méthodes personnalisées', link: '/guide/custom-services' },
      { text: 'Services manuels', link: '/guide/manual-service' },
      { text: 'Session avec Pinia', link: '/guide/session-auth-pinia' },
      { text: 'Migration Feathers-Pinia', link: '/guide/feathers-pinia' },
      { text: 'Client administrateur', link: '/guide/admin-client' },
      { text: 'Mode remote', link: '/guide/remote' },
      { text: 'Application remote + Keycloak', link: '/guide/remote-keycloak-app' },
      { text: 'Templates personnalisés', link: '/guide/template-overrides' },
      { text: 'Swagger historique', link: '/guide/swagger' },
      { text: 'Maintenance des dépendances', link: '/guide/dependency-maintenance' },
      { text: 'Flux de développement du dépôt', link: '/guide/repo-dev' },
      { text: 'Politique de support', link: '/guide/support-policy' },
      { text: 'Socle open source', link: '/guide/open-core' },
      { text: 'Open core et Pro', link: '/guide/open-core-vs-pro' },
    ]),
  },
]

const frReferenceSidebar = [
  {
    text: 'Socle technique',
    items: [
      { text: 'Vue d’ensemble', link: '/reference/' },
      { text: 'Architecture', link: '/reference/architecture' },
      { text: 'Processus du module', link: '/reference/module' },
      { text: 'Configuration', link: '/reference/configuration' },
      { text: 'RuntimeConfig', link: '/reference/runtime-config' },
    ],
  },
  {
    text: 'API Feathers et runtime',
    items: [
      { text: 'Services', link: '/reference/services' },
      { text: 'API client et composables', link: '/reference/runtime' },
      { text: 'Événements et cycle de vie', link: '/reference/events' },
      { text: 'Authentification', link: '/reference/authentication' },
      { text: 'Mode embedded', link: '/reference/embedded' },
      { text: 'Mode remote', link: '/reference/remote' },
    ],
  },
  {
    text: 'Génération et exploitation',
    items: [
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Templates', link: '/reference/templates' },
      { text: 'Modules serveur', link: '/reference/server-modules' },
      { text: 'Middleware', link: '/reference/middleware' },
      { text: 'MongoDB management', link: '/reference/mongodb-management' },
      { text: 'Doctor', link: '/reference/doctor' },
      { text: 'Dépannage', link: '/reference/troubleshooting' },
    ],
  },
  {
    text: 'Compléments',
    collapsed: true,
    items: [
      { text: 'Options détaillées', link: '/reference/options' },
      { text: 'Runtime en un fichier', link: '/reference/runtime-single-file' },
      { text: 'Conventions', link: '/reference/conventions' },
    ],
  },
]

const enGuideSidebar = [
  {
    text: 'Understand',
    items: [
      { text: 'Documentation plan', link: '/en/guide/complete-guide' },
      { text: 'Overview', link: '/en/reference/' },
      { text: 'Architecture', link: '/en/reference/architecture' },
      { text: 'Embedded and remote modes', link: '/en/guide/modes' },
    ],
  },
  {
    text: 'Get started',
    items: [
      { text: 'Quick start', link: '/en/guide/getting-started' },
      { text: 'Feathers and Zod services', link: '/en/guide/services' },
      { text: 'Frontend usage', link: '/en/guide/frontend' },
      { text: 'Validation playground', link: '/en/guide/playground' },
    ],
  },
  {
    text: 'Authentication',
    items: [
      { text: 'Local JWT auth', link: '/en/guide/auth-local' },
      { text: 'Keycloak SSO', link: '/en/guide/keycloak-sso' },
      { text: 'Keycloak + LDAP/AD', link: '/en/guide/remote-keycloak-ldap' },
      { text: 'Keycloak + LDAP/AD SSR', link: '/en/guide/remote-keycloak-ldap-ssr' },
    ],
  },
  {
    text: 'Module tools',
    items: productionVisible([
      { text: 'CLI', link: '/en/reference/cli' },
      { text: 'Feathers Builder client', link: '/en/guide/builder-client' },
      { text: 'Builder playground', link: '/en/guide/builder-playground' },
      { text: 'MongoDB management', link: '/en/reference/mongodb-management' },
      { text: 'File upload and download', link: '/en/guide/file-upload-download' },
    ]),
  },
  {
    text: 'Operations',
    items: [
      { text: 'Production', link: '/en/guide/production' },
      { text: 'Compatibility matrix', link: '/en/guide/compatibility-matrix' },
      { text: 'Known limits', link: '/en/guide/known-limits' },
      { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
      { text: 'Publishing', link: '/en/guide/publishing' },
      { text: 'Release checklist', link: '/en/guide/release-checklist' },
    ],
  },
  {
    text: 'Specialized guides',
    collapsed: true,
    items: productionVisible([
      { text: 'Main Quasar starter', link: '/en/guide/starter-quasar-unocss-pinia' },
      { text: 'Real-world Nuxt 4 + Quasar app', link: '/en/guide/real-world-nuxt4-quasar-app' },
      { text: 'Migrate an existing app', link: '/en/guide/migrate-existing-nuxt4-app' },
      { text: 'Custom methods', link: '/en/guide/custom-services' },
      { text: 'Manual services', link: '/en/guide/manual-service' },
      { text: 'Pinia session', link: '/en/guide/session-auth-pinia' },
      { text: 'Feathers-Pinia migration', link: '/en/guide/feathers-pinia' },
      { text: 'Admin client', link: '/en/guide/admin-client' },
      { text: 'Remote mode', link: '/en/guide/remote' },
      { text: 'Remote app + Keycloak', link: '/en/guide/remote-keycloak-app' },
      { text: 'Template overrides', link: '/en/guide/template-overrides' },
      { text: 'Legacy Swagger', link: '/en/guide/swagger' },
      { text: 'Dependency maintenance', link: '/en/guide/dependency-maintenance' },
      { text: 'Repository workflow', link: '/en/guide/repo-dev' },
      { text: 'Support policy', link: '/en/guide/support-policy' },
      { text: 'Open-source core', link: '/en/guide/open-core' },
      { text: 'Open core and Pro', link: '/en/guide/open-core-vs-pro' },
    ]),
  },
]

const enReferenceSidebar = [
  {
    text: 'Technical core',
    items: [
      { text: 'Overview', link: '/en/reference/' },
      { text: 'Architecture', link: '/en/reference/architecture' },
      { text: 'Module process', link: '/en/reference/module' },
      { text: 'Configuration', link: '/en/reference/configuration' },
      { text: 'RuntimeConfig', link: '/en/reference/runtime-config' },
    ],
  },
  {
    text: 'Feathers API and runtime',
    items: [
      { text: 'Services', link: '/en/reference/services' },
      { text: 'Client API and composables', link: '/en/reference/runtime' },
      { text: 'Events and lifecycle', link: '/en/reference/events' },
      { text: 'Authentication', link: '/en/reference/authentication' },
      { text: 'Embedded mode', link: '/en/reference/embedded' },
      { text: 'Remote mode', link: '/en/reference/remote' },
    ],
  },
  {
    text: 'Generation and operations',
    items: [
      { text: 'CLI', link: '/en/reference/cli' },
      { text: 'Templates', link: '/en/reference/templates' },
      { text: 'Server modules', link: '/en/reference/server-modules' },
      { text: 'Middleware', link: '/en/reference/middleware' },
      { text: 'MongoDB management', link: '/en/reference/mongodb-management' },
      { text: 'Doctor', link: '/en/reference/doctor' },
      { text: 'Troubleshooting', link: '/en/reference/troubleshooting' },
    ],
  },
  {
    text: 'Additional reference',
    collapsed: true,
    items: [
      { text: 'Detailed options', link: '/en/reference/options' },
      { text: 'Single-file runtime', link: '/en/reference/runtime-single-file' },
      { text: 'Conventions', link: '/en/reference/conventions' },
    ],
  },
]

export default defineConfig({
  base: '/nuxt-feathers-zod/',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/nuxt-feathers-zod/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }],
  ],
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: isProd ? internalGuideSrcExclude : [],

  locales: {
    root: {
      label: 'Français',
      lang: 'fr-FR',
      title: ' ',
      description: 'Nuxt 4 + FeathersJS v5 + Zod, services Feathers-first et CLI de génération',
      themeConfig: {
        nav: [
          { text: 'Vue d’ensemble', link: '/reference/' },
          { text: 'Démarrage', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/reference/architecture' },
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'CLI', link: '/reference/cli' },
          { text: 'Playground', link: '/guide/playground' },
          { text: 'Production', link: '/guide/production' },
          { text: 'Référence', link: '/reference/services' },
        ],
        sidebar: {
          '/guide/': frGuideSidebar,
          '/reference/': frReferenceSidebar,
        },
        socialLinks: [
          { icon: 'github', link: githubProjectUrl, ariaLabel: 'Dépôt GitHub nuxt-feathers-zod' },
          { icon: 'npm', link: npmProjectUrl, ariaLabel: 'Package npm nuxt-feathers-zod' },
        ],
        search: { provider: 'local' },
        editLink: {
          pattern: 'https://github.com/vevedh/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Modifier cette page',
        },
        footer: { message: 'Documentation technique de nuxt-feathers-zod', copyright: 'MIT' },
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
      description: 'Nuxt 4 + FeathersJS v5 + Zod with Feathers-first services and a generation CLI',
      themeConfig: {
        nav: [
          { text: 'Overview', link: '/en/reference/' },
          { text: 'Get started', link: '/en/guide/getting-started' },
          { text: 'Architecture', link: '/en/reference/architecture' },
          { text: 'Configuration', link: '/en/reference/configuration' },
          { text: 'CLI', link: '/en/reference/cli' },
          { text: 'Playground', link: '/en/guide/playground' },
          { text: 'Production', link: '/en/guide/production' },
          { text: 'Reference', link: '/en/reference/services' },
        ],
        sidebar: {
          '/en/guide/': enGuideSidebar,
          '/en/reference/': enReferenceSidebar,
        },
        socialLinks: [
          { icon: 'github', link: githubProjectUrl, ariaLabel: 'nuxt-feathers-zod GitHub repository' },
          { icon: 'npm', link: npmProjectUrl, ariaLabel: 'nuxt-feathers-zod npm package' },
        ],
        search: { provider: 'local' },
        editLink: {
          pattern: 'https://github.com/vevedh/nuxt-feathers-zod/edit/main/docs/:path',
          text: 'Edit this page',
        },
        footer: { message: 'nuxt-feathers-zod technical documentation', copyright: 'MIT' },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdatedText: 'Last updated',
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
      },
    },
  },

  themeConfig: {
    logo: '/images/nfz-feather.webp',
  },
})
