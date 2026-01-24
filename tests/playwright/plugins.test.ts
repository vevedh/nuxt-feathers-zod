import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../fixtures/plugins', import.meta.url)),
  },
})

/*
test.skip('plugins', async ({ page, goto }) => {
  const waitingForPlugin1 = new Promise(resolve => page.on('console', msg => (msg.text() === 'feathers-client-plugin 1') && resolve(true)))
  const waitingForPlugin2 = new Promise(resolve => page.on('console', msg => (msg.text() === 'feathers-client-plugin 2') && resolve(msg.text())))
  await goto('/', { waitUntil: 'load' })

  expect(await waitingForPlugin1).toBeTruthy()
  expect(await waitingForPlugin2).toBeTruthy()
})
*/

test('plugin1', async ({ page, goto }) => {
  const plugin1: Promise<string> = new Promise(resolve => page.on('console', msg => (msg.text() === 'feathers-client-plugin 1') && resolve(msg.text())))
  await goto('/', { waitUntil: 'hydration' })

  expect(await plugin1).toEqual('feathers-client-plugin 1')
})

test('plugin2', async ({ page, goto }) => {
  const plugin2: Promise<string> = new Promise(resolve => page.on('console', msg => (msg.text() === 'feathers-client-plugin 2') && resolve(msg.text())))
  await goto('/', { waitUntil: 'hydration' })

  expect(await plugin2).toEqual('feathers-client-plugin 2')
})
