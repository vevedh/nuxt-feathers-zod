import { z, type ZodRawShape, type ZodTypeAny } from 'zod'

type KeysOf<Shape extends ZodRawShape> = Extract<keyof Shape, string>

const order = z.union([z.literal(1), z.literal(-1)])

/** Coerce numbers coming from querystrings ("10" -> 10). */
function coerceNumber() {
  return z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '')
      return Number(v)
    return v
  }, z.number())
}

/** Accept an array or a comma-separated string. */
function coerceStringArrayFromCsv() {
  return z.preprocess((v) => {
    if (typeof v === 'string') {
      return v
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }
    return v
  }, z.array(z.string()))
}

export function sortDefinition<Shape extends ZodRawShape>(shape: Shape) {
  const properties = Object.keys(shape).reduce((acc, key) => {
    ;(acc as any)[key] = order.optional()
    return acc
  }, {} as Record<string, ZodTypeAny>)

  return z.object(properties).strict()
}

function arrayOfKeys<Shape extends ZodRawShape>(shape: Shape) {
  const keys = Object.keys(shape) as [KeysOf<Shape>, ...KeysOf<Shape>[]]
  return z.enum(keys).array()
}

export function queryProperty<
  T extends ZodTypeAny,
  X extends Record<string, ZodTypeAny> = {},
>(prop: T, extension: X = {} as X) {
  const nullishProp = prop.nullish()
  const propOptional = prop.optional()

  return z.union([
    // Direct equality (supports null/undefined if the base schema allows it)
    nullishProp,
    // Operator object
    z
      .object({
        $ne: nullishProp.optional(),
        $gt: propOptional.optional(),
        $gte: propOptional.optional(),
        $lt: propOptional.optional(),
        $lte: propOptional.optional(),
        $in: z.array(nullishProp).optional(),
        $nin: z.array(nullishProp).optional(),
        ...extension,
      })
      .strict(),
  ])
}

export function queryPropertiesShape<
  Shape extends ZodRawShape,
  X extends Partial<Record<KeysOf<Shape>, Record<string, ZodTypeAny>>> = {},
>(shape: Shape, extensions: X = {} as X) {
  const keys = Object.keys(shape) as KeysOf<Shape>[]
  return keys.reduce((acc, key) => {
    ;(acc as any)[key] = queryProperty((shape as any)[key], (extensions as any)[key]).optional()
    return acc
  }, {} as Record<KeysOf<Shape>, ZodTypeAny>)
}

/**
 * Zod equivalent of @feathersjs/typebox querySyntax():
 * - $select, $sort, $limit, $skip
 * - field filters with operator objects ($gt/$in/...)
 * - $and / $or (recursive)
 *
 * Extensions allow adding per-field custom operators (e.g. $regex for strings).
 */
export function zodQuerySyntax<
  Schema extends z.AnyZodObject,
  Shape extends Schema['shape'],
  X extends Partial<Record<KeysOf<Shape>, Record<string, ZodTypeAny>>> = {},
>(schema: Schema, extensions: X = {} as X) {
  const shape = schema.shape as Shape
  const keys = Object.keys(shape) as [KeysOf<Shape>, ...KeysOf<Shape>[]]

  const properties = queryPropertiesShape(shape as any, extensions)

  const baseQuery = z
    .object({
      $select: z
        .union([arrayOfKeys(shape as any), coerceStringArrayFromCsv().pipe(z.array(z.enum(keys)))])
        .optional(),
      $sort: sortDefinition(shape as any).optional(),
      $limit: coerceNumber().pipe(z.number().min(-1)).optional(),
      $skip: coerceNumber().pipe(z.number().min(0)).optional(),
      ...properties,
    })
    .strict()

  const query: z.ZodTypeAny = z.lazy(() =>
    baseQuery.extend({
      $or: z.array(query).optional(),
      $and: z.array(query).optional(),
    }).strict(),
  )

  return query
}
