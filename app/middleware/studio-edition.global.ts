import { getRequiredFeatureForRoute } from '../utils/studio-editions'

const PUBLIC_PATHS = new Set(['/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_PATHS.has(to.path)) return

  const requiredFeature = getRequiredFeatureForRoute(to.path)
  if (!requiredFeature) return

  const { state, refresh } = useStudioEdition()
  const context = state.value || await refresh()
  const feature = context?.featureMatrix?.items?.find((item: any) => item.key === requiredFeature)

  if (!feature || feature.state === 'enabled') return

  return navigateTo({
    path: '/studio-editions',
    query: {
      blocked: requiredFeature,
      from: to.path,
    },
  })
})
