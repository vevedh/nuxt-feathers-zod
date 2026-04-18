# NFZ vs `@nuxtjs/supabase`

`@nuxtjs/supabase` and `nuxt-feathers-zod` solve different layers of the stack.

## Where Supabase shines

- immediate Nuxt integration
- obvious client composables and server helpers
- clear SSR auth/session story
- a simple product narrative around **Database / Auth / Storage / Realtime**

## Where NFZ should position itself differently

NFZ targets a different architecture layer:

- **embedded mode**: Feathers backend inside Nuxt/Nitro
- **remote mode**: Feathers client against an external API
- **CLI-first** workflow
- typed services, hooks and custom business logic
- enterprise auth compatibility
- a path toward diagnostics, builder and ops tooling

## Practical summary

- choose **Supabase** when you mainly want a managed BaaS platform
- choose **NFZ** when you want to build and operate a Feathers backend architecture inside the Nuxt ecosystem
