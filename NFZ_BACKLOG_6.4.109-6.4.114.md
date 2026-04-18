# NFZ backlog 6.4.109 → 6.4.114

## Goal
Close the main incomplete areas identified in 6.4.108 and track the phases directly inside the archive.

## 6.4.109 — Phase 3A: admin diagnostics + devtools
- add `useNfzAdminClient()`
- expose diagnostics/devtools metadata in `runtimeConfig.public._feathers.admin`
- add public package alias `nuxt-feathers-zod/admin-client`
- document the helper in FR/EN
- status: **completed**

## 6.4.110 — Phase 3A hotfix
- repair `sanity:file-service-template`
- keep the Phase 3A sources intact while unblocking the release flow
- status: **completed**

## 6.4.111 — Phase 3B: Builder Studio client
- add `useBuilderClient()`
- expose builder metadata in `runtimeConfig.public`
- formalize builder routes as first-class runtime surfaces
- status: **completed**

## 6.4.112 — Phase 3C: playground validation surface
- align playground builder page on `useProtectedPage()` + `useBuilderClient()`
- document FR/EN
- status: **completed**

## 6.4.113 — file-service regression tests
- test `add file-service`
- compile generated scaffold
- keep dedicated sanity checks
- status: **completed**

## 6.4.114 — product finish
- harden the local `file-service` starter with max-size and MIME guards
- improve quickstart clarity FR/EN, including Nuxt 4 app creation before module install
- document the recommended `clean:repo` flow for module development
- reduce doc drift in `docs/en`
- start pinning critical runtime / CLI dependencies away from `latest`
- status: **completed in this archive**
