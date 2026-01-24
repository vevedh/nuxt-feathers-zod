type putData = [expr: any, content: string, def?: string]

export function put(expr: any, content: string, def: string = ''): string {
  return expr ? content : def
}
export function puts(puts: putData[]): string {
  return puts.map(p => put(p[0], p[1], p?.[2])).filter(Boolean).join('\n')
}
