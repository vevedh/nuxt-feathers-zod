export interface AliasEntry {
  find: string | RegExp
  replacement: string
}

export type AliasInput = AliasEntry[] | Record<string, string> | undefined
