import type { ZodError } from 'zod'

export interface ZodIssueItem {
  path: string
  code: string
  message: string
}

/**
 * Formats Zod issues into a stable, UI-friendly structure.
 */
export function formatZodIssues(err: ZodError): ZodIssueItem[] {
  return err.issues.map(i => ({
    path: i.path.length ? i.path.join('.') : '',
    code: i.code,
    message: i.message,
  }))
}
