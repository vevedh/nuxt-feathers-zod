---
editLink: false
---
# Runtime configuration

`runtimeConfig.public.feathers` exposes values needed on the client at runtime, for example:

- REST base URL (if API is not same-origin)
- REST prefix/path (e.g. `/feathers`)

Custom client methods should read these values dynamically instead of hardcoding paths.
