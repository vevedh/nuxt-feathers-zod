---
layout: false
editLink: false
---
# Custom service example (action-style)

An “action-style” service is an adapter-less service exposing custom methods such as `run`, `status`, or `reindex`.

The reference template includes:

- server service without adapter
- Zod validation hooks
- transport-agnostic client method patching
- a playground page to test `/actions`

Use this style when you want a clean “command bus” API under Feathers.
