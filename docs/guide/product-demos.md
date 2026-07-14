# Démonstrations produit NFZ

Cette page sert de **playbook de démonstration** pour montrer rapidement la valeur de `nuxt-feathers-zod`.

## Objectif

En moins de 5 minutes, un visiteur doit comprendre que NFZ n'est pas seulement un connecteur Nuxt, mais un **socle backend-first** pour Nuxt 4 avec Feathers, diagnostics et génération de services.

## Parcours recommandé

### 1. Auth demo

Montrer :

- login local
- logout
- `reAuthenticate()`
- état `isAuthenticated`
- utilisateur courant
- session/token si disponible

Message produit : NFZ sait cadrer l'auth d'une application Nuxt full-stack, en embedded comme en remote.

### 2. CRUD demo

Montrer :

- création d'une entrée métier
- rafraîchissement de la liste
- mise à jour simple
- suppression
- retour visuel immédiat

Message produit : NFZ ne sert pas uniquement à se connecter à une API, il sert à **structurer** les services Feathers d'une application.

### 3. Diagnostics demo

Montrer :

- timeline des traces
- filtres par origine / niveau / event
- résumé runtime
- export JSON

Message produit : NFZ va vers un outillage d'exploitation et d'observabilité que les intégrations BaaS n'adressent pas de la même façon.

### 4. Services manager demo

Montrer :

- manifest
- preview multi-fichiers
- dry-run
- apply
- logique CLI-first / servicesDir

Message produit : NFZ ouvre une trajectoire vers un **builder de backend Nuxt/Feathers**.

## Ordre de roadmap recommandé

1. stabiliser `/services-manager`
2. finaliser `apply` vers une structure `services/` réelle
3. renforcer diagnostics
4. livrer des pages de démo officielles
5. seulement ensuite enrichir presets, RBAC et multi-instance


## Builder demo

Le builder gagne en lisibilité avec des presets officiels et un routage direct vers `/services-manager?preset=...`.
