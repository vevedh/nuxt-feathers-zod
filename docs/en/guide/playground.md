# Explore the module with the playground

The playground is a complete Nuxt application that demonstrates module features in a browser. Use it to understand a workflow before reproducing the configuration in your own project.

## Start it

From the source repository:

```bash
bun install --frozen-lockfile
bun run dev
```

Then open the URL printed by Nuxt.

## Dashboard

The dashboard checks Nuxt configuration, the Feathers client, a public service, authentication, a protected service, and SSR hydration.

![Playground quick checks](/images/guides/playwright/playwright-dashboard.png)

The **Run quick checks** action does not change persistent data.

## Connection and session diagnostics

The **Essential tests** page checks a service first and then a local session. It displays useful details for diagnosing a transport or authentication issue.

![Service and authentication diagnostics](/images/guides/playwright/playwright-diagnostics.png)

## Useful workflows

Each route maps to a real playground screen. Diagnostic pages remain available without a session; protected business pages request authentication when their scenario requires it.

| Route | Page | What you can test |
|---|---|---|
| `/` | Dashboard | overall status and quick checks |
| `/tests` | Essential tests | service, local session, and token |
| `/validation` | Zod validation | schemas and validation errors |
| `/messages` | Messages | protected Feathers CRUD |
| `/actions` | Actions | custom service method |
| `/mongo` | MongoDB | connection diagnostics and administration when MongoDB is enabled |
| `/builder` | Builder | overview of generation features |
| `/auth-runtime` | Authentication | principal, events, and provider |
| `/embedded` | Embedded mode | Feathers backend integrated into Nuxt |
| `/remote/rest` | Remote REST | HTTP connection to a remote API |
| `/remote/socketio` | Remote Socket.IO | real-time transport and reconnection |
| `/middleware` | Server middleware | module, plugin, and service ordering |
| `/ldapusers` | Remote service | ldapusers service example |
| `/mongos` | Mongos service | Feathers reads and Pinia state |
| `/console/builder` | Builder console | NFZ generation console |
| `/console/rbac` | RBAC console | roles and capabilities |

## Trustworthy screenshots

Documentation images are produced by playground Playwright scenarios. A screenshot is updated only after the related functional assertions pass.

## Demo data

The playground uses test-only identities and secrets. Never copy those values into production.

<!-- release-version: 6.6.0 -->
