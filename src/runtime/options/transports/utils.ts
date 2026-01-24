import { NuxtFeathersError } from '../../errors'

export function checkPath(path?: string) {
  if (!path?.startsWith('/'))
    throw new NuxtFeathersError(`transport path option must start with /! Current path: ${path}`)
  if (!/^[\w\-/.]+$/.test(path))
    throw new NuxtFeathersError(`transport path option must be a valid URL path! ${path} is not valid.`)
}
