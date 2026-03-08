---
editLink: false
---
# Templates

Le module génère son runtime sous :

```txt
.nuxt/feathers/
```

## Arborescence typique

```txt
.nuxt/feathers/
├─ client/
├─ server/
└─ types/
```

## Overrides

Il est possible de surcharger les templates runtime avec un dossier de projet,
généralement :

```txt
feathers/templates
```

Contrôle via `feathers.templates` :

- `enabled`
- `dirs`
- `strict`
- `allow`

## Cas d'usage

- adapter le plugin client généré
- personnaliser le plugin serveur
- modifier les types générés
- prototyper rapidement un comportement sans forker le module
