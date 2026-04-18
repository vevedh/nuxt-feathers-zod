# NFZ vs `@nuxtjs/supabase`

`@nuxtjs/supabase` et `nuxt-feathers-zod` ne répondent pas exactement au même besoin.

## Là où Supabase est très fort

- intégration Nuxt très immédiate
- composables évidents côté client et helpers serveur
- auth/session SSR déjà très lisibles
- récit produit simple : **Database / Auth / Storage / Realtime**

## Là où NFZ doit se positionner autrement

NFZ vise un autre niveau d’architecture :

- **mode embedded** : backend Feathers dans Nuxt/Nitro
- **mode remote** : client Feathers vers une API externe
- workflow **CLI-first**
- services typés, hooks et logique métier sur mesure
- compatibilité auth enterprise
- trajectoire vers diagnostics, builder et outillage ops

## Résumé

- choisis **Supabase** si tu veux surtout consommer une plateforme BaaS managée
- choisis **NFZ** si tu veux construire et piloter une architecture backend Feathers dans l’écosystème Nuxt

## Conséquence produit pour NFZ

La roadmap vNext ne doit pas copier Supabase. Elle doit rendre **plus lisible** :

1. l’entrée DX
2. l’auth
3. les helpers serveur
4. le builder de services
5. les diagnostics
6. la story realtime
7. l’adoption enterprise
