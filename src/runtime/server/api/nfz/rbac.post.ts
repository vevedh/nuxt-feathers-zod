import { defineEventHandler, readBody } from 'h3'
import { callNfzConsoleService } from '../../console-bridge'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../../console-services'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return callNfzConsoleService(event, NFZ_CONSOLE_SERVICE_PATHS.rbac, 'patch', ['current', body])
})
