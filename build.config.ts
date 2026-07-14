import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  failOnWarn: false,
  externals: [
    'h3',
    'ufo',
    'cookie-es',
    'radix3',
    'destr',
    'uncrypto',
    'iron-webcrypto',
    'node-mock-http',
    'node-mock-http/_polyfill/events',
    'node-mock-http/_polyfill/buffer',
  ],
})
