import { useRuntimeConfig } from '#imports'
import {
  getPublicDiagnosticsConfig,
  getPublicDiagnosticsPath,
  getPublicDevtoolsConfig,
  getPublicDevtoolsCssPath,
  getPublicDevtoolsIconPath,
  getPublicDevtoolsJsonPath,
  getPublicDevtoolsPath,
} from '../utils/config'
import { useAuthBoundFetch } from './useAuthBoundFetch'

export interface NfzAdminClientConfigSnapshot {
  diagnostics: ReturnType<typeof getPublicDiagnosticsConfig>
  devtools: ReturnType<typeof getPublicDevtoolsConfig>
}

export function useNfzAdminClient() {
  const publicConfig = useRuntimeConfig().public as any
  const authFetch = useAuthBoundFetch({ auth: 'required', retryOn401: true })

  const diagnostics = getPublicDiagnosticsConfig(publicConfig)
  const devtools = getPublicDevtoolsConfig(publicConfig)

  const diagnosticsPath = getPublicDiagnosticsPath(publicConfig)
  const devtoolsPath = getPublicDevtoolsPath(publicConfig)
  const devtoolsJsonPath = getPublicDevtoolsJsonPath(publicConfig)
  const devtoolsCssPath = getPublicDevtoolsCssPath(publicConfig)
  const devtoolsIconPath = getPublicDevtoolsIconPath(publicConfig)

  const getDiagnosticsPayload = <T = any>() => authFetch<T>(devtoolsJsonPath)
  const getDiagnostics = async () => {
    const payload = await getDiagnosticsPayload<any>()
    return Array.isArray(payload?.diagnostics) ? payload.diagnostics : []
  }

  return {
    diagnostics,
    devtools,
    paths: {
      diagnostics: diagnosticsPath,
      devtools: devtoolsPath,
      devtoolsJson: devtoolsJsonPath,
      devtoolsCss: devtoolsCssPath,
      devtoolsIcon: devtoolsIconPath,
    },
    getConfigSnapshot(): NfzAdminClientConfigSnapshot {
      return {
        diagnostics,
        devtools,
      }
    },
    getDiagnostics,
    getDiagnosticsPayload,
    getDevtoolsJson: <T = any>() => authFetch<T>(devtoolsJsonPath),
    getDevtoolsHtml: () => authFetch<string>(devtoolsPath),
    getDevtoolsCss: () => authFetch<string>(devtoolsCssPath),
    getDevtoolsIcon: () => authFetch<any>(devtoolsIconPath, { auth: 'required' }),
  }
}
