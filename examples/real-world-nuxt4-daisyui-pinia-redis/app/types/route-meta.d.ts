export {}

declare module '#app' {
  interface PageMeta {
    public?: boolean
    roles?: string[]
  }
}
