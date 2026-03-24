---
editLink: false
---
# Checklist de release

Cette page n’est plus publiée dans la documentation publique.

Les procédures de publication npm/git et les notes d’administration du dépôt sont désormais maintenues dans `README_private.md` côté mainteneur.


## Stabilisation 6.4.25

Avant publication officielle :

- vérifier `bunx nuxt-feathers-zod --help`
- vérifier `bunx nuxt-feathers-zod doctor`
- vérifier la cohérence README + `docs/guide/cli.md` + `docs/reference/cli.md` + `docs/en/guide/cli.md`
- vérifier que la surface CLI documentée couvre aussi `templates/plugins/modules/middlewares`
- vérifier que la version `package.json` cible la release à publier
