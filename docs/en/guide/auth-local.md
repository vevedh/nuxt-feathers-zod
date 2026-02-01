---
editLink: false
---
# Local auth (JWT)

This project can use Feathers local authentication (email/password) + JWT.

Typical endpoints:

- `POST /feathers/users` (register)
- `POST /feathers/authentication` (login -> JWT)
- `GET /feathers/users` (protected -> Bearer token)

Make sure you generated `users` and enabled authentication according to the project configuration.
