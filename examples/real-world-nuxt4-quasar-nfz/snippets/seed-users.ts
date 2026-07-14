import type { Application } from 'nuxt-feathers-zod/server'

export async function seedUsers(app: Application): Promise<void> {
  if (process.env.AUTH_SEED_ENABLED !== 'true') {
    return
  }

  const users = app.service('users')

  const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@example.local'
  const adminPassword = process.env.AUTH_ADMIN_PASSWORD || 'changeMe'

  const existing = await users.find({
    query: {
      email: adminEmail,
      $limit: 1,
    },
  }) as { data?: unknown[] } | unknown[]

  const data = Array.isArray(existing) ? existing : existing.data ?? []

  if (data.length > 0 && process.env.AUTH_SEED_RESET !== 'true') {
    return
  }

  if (data.length > 0 && process.env.AUTH_SEED_RESET === 'true') {
    const first = data[0] as { _id?: string, id?: string }
    await users.patch(String(first._id ?? first.id), {
      password: adminPassword,
      roles: ['admin'],
      groups: ['ADMIN'],
      isAdmin: true,
      status: 'active',
    })
    return
  }

  await users.create({
    email: adminEmail,
    password: adminPassword,
    displayName: 'Administrateur',
    roles: ['admin'],
    groups: ['ADMIN'],
    isAdmin: true,
    status: 'active',
  })
}
