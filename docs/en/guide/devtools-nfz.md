# NFZ DevTools

The NFZ DevTools tab is now part of the OSS stabilization workflow.

It exposes:

- resolved mode (`embedded` / `remote`)
- server enablement
- REST / websocket transport state
- REST framework (`express` / `koa`)
- embedded and remote auth state
- detected local services
- declared remote services
- runtime public config summary
- stabilization diagnostics and known-good scenarios

## Routes used in development

- `/__nfz-devtools` in the UI is exposed as `/__nfz-devtools`
- CSS: `/__nfz-devtools.css`
- JSON payload: `/__nfz-devtools.json`

## devtools-ui-kit integration

PATCH OSS-4 vendors a lightweight subset of the provided `devtools-ui-kit` source under:

- `src/runtime/devtools-ui-kit/assets`
- `src/runtime/devtools-ui-kit/components`

The current NFZ tab still uses an iframe route for robustness, but now consumes the vendored styles and keeps the vendored components available as a future migration base for a richer client-side DevTools app.
