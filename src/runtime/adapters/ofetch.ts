// grabbed from the legacy service-store wrapper
import type { Params } from '@feathersjs/feathers'
import * as restClientModule from '@feathersjs/rest-client'

interface FetchClientLike {
  options: { headers?: Record<string, string> }
  connection: { raw(url: string, options: any): Promise<{ _data: any, status: number }> }
  request(options: any, params: Params): Promise<any>
}

type FetchClientConstructor = new (...args: any[]) => FetchClientLike

const fetchClientBaseCandidate = (restClientModule as any).FetchClient
  ?? (restClientModule as any).default?.FetchClient

const FetchClientBase = fetchClientBaseCandidate as FetchClientConstructor

if (!FetchClientBase) {
  throw new TypeError('[nuxt-feathers-zod] Unable to resolve @feathersjs/rest-client FetchClient.')
}

// A feathers-rest transport adapter for https://github.com/unjs/ofetch
export class OFetch extends FetchClientBase {
  override async request(options: any, params: Params) {
    const fetchOptions = Object.assign({}, options, (params as any).connection)

    fetchOptions.headers = Object.assign({ Accept: 'application/json' }, this.options.headers, fetchOptions.headers)

    if (options.body)
      fetchOptions.body = options.body

    try {
      const response = await this.connection.raw(options.url, fetchOptions)
      const { _data, status } = response

      if (status === 204)
        return null
      return _data
    }
    catch (error: any) {
      throw error.data
    }
  }
}
