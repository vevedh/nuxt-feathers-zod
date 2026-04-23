const SERVICE_PATH = 'e2e-accounts'

export default async function seedUsers(app: any) {
  if (!app || typeof app.service !== 'function')
    return

  const users = app.service(SERVICE_PATH)
  if (!users)
    return

  const existing = await users.find({
    paginate: false,
    query: { userId: 'e2e' },
  }).catch(() => [])

  const list = Array.isArray(existing) ? existing : existing?.data || []
  if (!list.length) {
    await users.create({
      userId: 'e2e',
      password: '12345',
    })
  }
}
