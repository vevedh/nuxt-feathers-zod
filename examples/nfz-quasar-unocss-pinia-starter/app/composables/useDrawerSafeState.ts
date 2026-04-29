import { useQuasar } from 'quasar'

export function useDrawerSafeState() {
  const $q = useQuasar()
  const hydrated = ref(false)
  const drawerOpen = ref(true)

  const isMobile = computed(() => {
    return hydrated.value ? $q.screen.lt.md : false
  })

  const drawerOverlay = computed(() => isMobile.value)
  const drawerBehavior = computed<'desktop' | 'mobile'>(() => {
    return isMobile.value ? 'mobile' : 'desktop'
  })

  function toggleDrawer(): void {
    drawerOpen.value = !drawerOpen.value
  }

  function closeDrawerOnMobile(): void {
    if (isMobile.value)
      drawerOpen.value = false
  }

  onMounted(() => {
    hydrated.value = true
    drawerOpen.value = !$q.screen.lt.md
  })

  watch(isMobile, (mobile) => {
    drawerOpen.value = !mobile
  })

  return {
    drawerOpen,
    drawerOverlay,
    drawerBehavior,
    isMobile,
    toggleDrawer,
    closeDrawerOnMobile,
  }
}
