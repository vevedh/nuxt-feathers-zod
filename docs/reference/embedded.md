---
editLink: false
---
# Mode embedded

En mode embedded, le serveur Feathers est démarré à l'intérieur de Nuxt/Nitro.

## Vue d'ensemble

```txt
Nuxt
└─ Nitro
   └─ Feathers App
      ├─ services
      ├─ hooks
      ├─ auth
      └─ transports
```

## Runtime généré

Le runtime serveur est généré dans :

```txt
.nuxt/feathers/server/
```

Fichiers typiques :

```txt
app.ts
plugin.ts
modules/*
```

## Routes REST

Par défaut, les services sont exposés sous :

```txt
/feathers/<service>
```

Exemple :

```txt
GET /feathers/users
```

## Conditions de bon fonctionnement

- un ou plusieurs services doivent exister dans `servicesDirs`
- les services doivent être générés via la CLI ou respecter les conventions NFZ
- si l'auth embedded est activée, un service `users` local est requis

## Server modules

Le serveur peut charger des modules additionnels comme :

- `secure-defaults`
- `mongodb`
- `helmet`
- `compression`
