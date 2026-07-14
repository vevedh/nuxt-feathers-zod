import type { FormatName } from 'ajv-formats'
import type { ModuleOptions } from '.'
import { klona } from 'klona'

export type ValidatorFormatsOptions = Array<FormatName>

export interface ValidatorOptions {
  formats: ValidatorFormatsOptions
  extendDefaults: boolean
}

export interface ResolvedValidatorOptions {
  formats: ValidatorFormatsOptions
}

export const validatorFormatsDefaults: ValidatorFormatsOptions = [
  'date-time',
  'time',
  'date',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
]

export function getValidatorDefaults(extendDefaults: boolean): ResolvedValidatorOptions {
  return { formats: extendDefaults ? klona(validatorFormatsDefaults) : [] }
}

export function resolveValidatorOptions(validator: ModuleOptions['validator']): ResolvedValidatorOptions {
  if (!validator.formats.length)
    return getValidatorDefaults(validator.extendDefaults)

  const formats = validator.extendDefaults
    ? validator.formats.concat(validatorFormatsDefaults)
    : validator.formats

  const resolvedValidator: ResolvedValidatorOptions = {
    formats: Array.from(new Set(formats)),
  }

  return resolvedValidator
}
