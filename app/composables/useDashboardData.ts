import { storeToRefs } from 'pinia'

export function useDashboardData() {
  const homeMenusStore = useHomeMenusStore()
  const usersStore = useUsersStore()
  const { loading: menusLoading, error: menusError, leftMenus, rightMenus } = storeToRefs(homeMenusStore)
  const { loading: usersLoading, error: usersError, items: users } = storeToRefs(usersStore)

  const loading = computed(() => menusLoading.value || usersLoading.value)
  const error = computed(() => menusError.value || usersError.value || null)

  async function refresh() {
    await Promise.all([
      homeMenusStore.refresh({ $limit: 100, $sort: { order: 1, createdAt: -1 } }),
      usersStore.refresh({ $limit: 10, $sort: { createdAt: -1 } }),
    ])
  }

  async function seedMenus() {
    await homeMenusStore.seedDefaults()
    await usersStore.refresh({ $limit: 10, $sort: { createdAt: -1 } }).catch(() => null)
  }

  return { loading, error, leftMenus, rightMenus, users, refresh, seedMenus }
}
