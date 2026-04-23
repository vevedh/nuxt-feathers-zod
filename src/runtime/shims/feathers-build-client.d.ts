declare module '#build/feathers/client/connection' {
  export function connection(
    baseUrl: string,
    overrides?: {
      mode?: 'embedded' | 'remote'
      restPath?: string
      websocketPath?: string
      transport?: 'auto' | 'rest' | 'socketio'
    },
  ): (client: unknown) => void
}

declare module '#build/feathers/client/authentication' {
  export function authentication(client: unknown): void
}
