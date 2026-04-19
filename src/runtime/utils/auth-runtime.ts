export function looksLikeMissingAccessTokenError(error: any): boolean {
  const name = String(error?.name || '').toLowerCase()
  const className = String(error?.className || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  const code = Number(error?.code || error?.statusCode || error?.status || 0)

  return (
    message.includes('no accesstoken found in storage')
    || message.includes('could not find stored access token')
    || message.includes('no access token')
    || ((name === 'notauthenticated' || className === 'not-authenticated' || code === 401) && (message.includes('storage') || message.includes('token')))
  )
}

export function shouldTreatReauthAsAnonymous(error: any, accessToken: string | null | undefined): boolean {
  return !accessToken && looksLikeMissingAccessTokenError(error)
}
