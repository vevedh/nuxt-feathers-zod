# CLI

Le CLI `nuxt-feathers-zod` est le point d’entrée recommandé pour initialiser un projet, générer les services et maintenir la cohérence entre `nuxt.config.ts`, les manifests et le runtime.

Pour la liste exhaustive des commandes et flags, consulte la [référence CLI](/reference/cli).

## Commande d’entrée

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

Alias :

```bash
bunx nfz <command> [args] [--flags]
```

## Commandes les plus utilisées

```bash
# Initialiser un backend embedded
bunx nuxt-feathers-zod init embedded --force

# Initialiser un client remote
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force

# Générer un service
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod

# Générer un service MongoDB
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --schema zod

# Générer un service action custom
bunx nuxt-feathers-zod add service actions --custom --methods find,get --customMethods run,preview

# Déclarer un service distant
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get

# Diagnostiquer le projet
bunx nuxt-feathers-zod doctor
```

## Workflow conseillé

1. Initialise le mode (`embedded` ou `remote`).
2. Génère les services avec `add service`.
3. Active les schémas via `--schema zod` pour les services métier.
4. Utilise `schema <service>` pour faire évoluer les champs.
5. Lance `doctor` après une migration ou une modification importante.
6. Utilise `--dry` avant les opérations sensibles.

## Bonnes pratiques

- Évite de créer manuellement les premiers services.
- Ne garde pas des aliases historiques dans la documentation applicative.
- Versionne les fichiers générés importants.
- Documente les overrides de templates.
- Vérifie le build et le typecheck après une génération importante.


<!-- release-version: 6.5.29 -->
