import { defineEventHandler, getQuery } from 'h3'
import { callNfzConsoleService } from '../../console-bridge'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../../console-services'

export default defineEventHandler(async event => callNfzConsoleService(
  event,
  NFZ_CONSOLE_SERVICE_PATHS.services,
  'find',
  [],
  getQuery(event),
))
