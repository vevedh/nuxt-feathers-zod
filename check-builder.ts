import { createService, buildGeneratedFiles } from './shared/builder'

const samples = [
  createService({ name: 'users', path: 'users', collection: 'users', adapter: 'mongodb', methods: ['find','get','create','patch','remove'], idField: 'id' }),
  createService({ name: 'home-menus', path: 'api/v1/home-menus', collection: 'home-menus', adapter: 'mongodb', methods: ['find','get','create','patch','remove'], idField: 'id' }),
  createService({ name: 'adcs-certificates', path: 'api/v1/adcs-certificates', collection: 'adcs-certificates', adapter: 'custom', methods: ['create'], idField: 'id' }),
]

for (const sample of samples) {
  const files = buildGeneratedFiles(sample, 'services')
  console.log('SERVICE', sample.name)
  for (const file of files) {
    console.log('FILE', file.path)
    console.log(file.content.split('\n').slice(0, 12).join('\n'))
    console.log('---')
  }
}
