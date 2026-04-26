import { getClientAuthContents } from './dist/runtime/templates/client/authentication.js'
const opts = { client: { remote: { auth: { enabled: false } } }, auth: { authStrategies: ['local','jwt'] } }
const a = getClientAuthContents(opts)()
console.log(a.includes('@feathersjs/authentication-client') ? 'bad-auth' : 'ok-auth')
