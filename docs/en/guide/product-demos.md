# NFZ product demos

This page is the official **demo playbook** for showing the value of `nuxt-feathers-zod` quickly.

## Goal

In less than 5 minutes, a visitor should understand that NFZ is not just a Nuxt connector. It is a **backend-first foundation** for Nuxt 4 with Feathers, diagnostics and service generation.

## Recommended flow

### 1. Auth demo

Show:

- local login
- logout
- `reAuthenticate()`
- `isAuthenticated` state
- current user
- session/token when available

Product message: NFZ can frame authentication for a full-stack Nuxt application, both in embedded and remote mode.

### 2. CRUD demo

Show:

- creating a business record
- refreshing the list
- simple update
- delete
- immediate visual feedback

Product message: NFZ is not only about connecting to an API, it helps **structure** Feathers services inside an application.

### 3. Diagnostics demo

Show:

- trace timeline
- filters by source / level / event
- runtime summary
- JSON export

Product message: NFZ is moving toward operational tooling and observability that BaaS integrations usually do not expose the same way.

### 4. Services manager demo

Show:

- manifest
- multi-file preview
- dry-run
- apply
- CLI-first / servicesDir logic

Product message: NFZ opens a path toward a **Nuxt/Feathers backend builder**.

## Recommended roadmap order

1. stabilize `/services-manager`
2. finalize `apply` into a real `services/` structure
3. strengthen diagnostics
4. ship official demo pages
5. only then expand presets, RBAC and multi-instance


## Builder demo

The builder becomes easier to explain with official presets and direct routing to `/services-manager?preset=...`.
