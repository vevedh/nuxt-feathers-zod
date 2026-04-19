import { klona } from 'klona'

export interface AuthLocalOptions {
  hashSize?: number | undefined
  usernameField?: string
  passwordField?: string
  entityUsernameField?: string
  entityPasswordField?: string
  errorMessage?: string
}

export const authLocalDefaults: AuthLocalOptions = {
  usernameField: 'userId',
  passwordField: 'password',
  entityUsernameField: 'userId',
  entityPasswordField: 'password',
}

export function getAuthLocalDefaults(): AuthLocalOptions {
  return klona(authLocalDefaults)
}
