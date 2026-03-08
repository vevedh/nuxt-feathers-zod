---
editLink: false
---
# Limites connues

Cette page documente les limites assumées du socle open source actuel.

## Limites fonctionnelles

- la **console avancée** n’est pas figée dans le core open source
- le **builder visuel** ne fait pas partie du contrat stable public
- les **presets métier avancés** ne sont pas encore contractualisés
- la **discovery distante enrichie** n’est pas un flux standard figé

## Limites de méthode

- la création manuelle de services est possible, mais **pas la voie recommandée** pour démarrer
- certaines commandes `init` patchent `nuxt.config.ts` de façon fiable surtout quand le fichier reste de forme standard
- les scénarios auth complexes demandent toujours une validation de bout en bout

## Limites documentaires

- la doc se concentre volontairement sur le **core standard**
- les fonctionnalités en cours de stabilisation doivent rester en dehors des parcours “quick start”

## Principe de stabilité

Quand une capacité n’a pas :

- un flux CLI clair,
- un exemple reproductible,
- un comportement testé,
- et une doc alignée,

elle ne doit pas être présentée comme un pilier du core.
