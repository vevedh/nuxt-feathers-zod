# Admin client runtime helper

La phase **6.4.109** introduit `useNfzAdminClient()` pour les surfaces **diagnostics** et **DevTools**.

## Pourquoi

Le module avait déjà un helper auth-aware solide pour Mongo :

- `useMongoManagementClient()`
- `useProtectedTool()`
- `useAuthBoundFetch()`

Le but de cette phase est d'appliquer le même principe aux routes internes d'administration NFZ.

## Ce que fait `useNfzAdminClient()`

Le composable utilise `useAuthBoundFetch()` et lit les routes publiques exposées dans `runtimeConfig.public._feathers.admin`.

Il permet de consommer de façon auth-aware :

- `__nfz-devtools.json`
- `__nfz-devtools`
- `__nfz-devtools.css`
- `__nfz-devtools-icon.png`

## Exemple

```ts
const admin = useNfzAdminClient()

const payload = await admin.getDevtoolsJson()
const diagnostics = await admin.getDiagnostics()
```

## Métadonnées publiques exposées

Le module ajoute maintenant dans `runtimeConfig.public._feathers` :

```ts
{
  admin: {
    diagnostics: {
      enabled: true,
      path: '/__nfz-devtools',
      jsonPath: '/__nfz-devtools.json',
      format: 'nfz-devtools-payload'
    },
    devtools: {
      enabled: true,
      path: '/__nfz-devtools',
      jsonPath: '/__nfz-devtools.json',
      cssPath: '/__nfz-devtools.css',
      iconPath: '/__nfz-devtools-icon.png'
    }
  }
}
```

## Limite actuelle

Cette phase couvre **diagnostics + devtools**.

Le helper dédié au **Builder Studio** arrive dans la phase suivante.
