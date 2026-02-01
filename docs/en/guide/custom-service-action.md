---
layout: false
editLink: false
---
# Custom service example (action-style)

An “action” service is a custom service exposing RPC-like methods such as `run`, `status`, `reindex`, etc.

The reference template includes:

- server service without adapter
- Zod validation hooks
- transport-agnostic client method patching
- a playground page to test `/actions`

Use this style when you want a clean “command bus” API under Feathers.
