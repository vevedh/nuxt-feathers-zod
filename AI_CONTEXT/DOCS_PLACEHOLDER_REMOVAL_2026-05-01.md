# Suppression des pages placeholder VitePress — 2026-05-01

## Objectif

Remplacer toutes les pages qui contenaient uniquement un message de conservation de navigation par des contenus utiles pour développeurs.

## Portée

- 23 pages françaises sous `docs/guide/**` et `docs/reference/**`.
- 48 pages anglaises sous `docs/en/guide/**` et `docs/en/reference/**`.
- Aucun fichier de branding VitePress n’a été modifié : logo, titre, images plume et thème existant sont conservés.

## Principe éditorial appliqué

Chaque page concernée contient maintenant :

- une explication de l’objectif ;
- une section “Quand utiliser cette option ?” ;
- un exemple `nuxt.config.ts` ;
- un exemple CLI ;
- un exemple runtime ou HTTP ;
- des points de vigilance et bonnes pratiques.

## Vérifications statiques

- Le texte `Cette page est conservée pour rendre la navigation VitePress cohérente` n’est plus présent.
- Le texte `This page is kept to make the VitePress navigation coherent` n’est plus présent.
- Les frontmatters `editLink: false` sont conservés.
