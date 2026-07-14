import { useSessionStore } from './session'

/**
 * Backward-compatible alias.
 *
 * New NFZ applications should use useSessionStore(). Existing applications can
 * keep useAuthStore() without changing their login/logout code.
 */
export const useAuthStore = useSessionStore
