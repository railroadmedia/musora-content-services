import * as v from 'valibot'
import { SyncValidationError } from './index'

const validate = <T>(schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>) =>
  (val: unknown): T => {
    const result = v.safeParse(schema, val)
    if (!result.success) {
      const issue = result.issues[0]
      throw new SyncValidationError(issue.message, issue)
    }
    return result.output
  }

const integer = v.pipe(v.number(), v.integer())
const uint = v.pipe(integer, v.minValue(0))
const positiveInteger = v.pipe(integer, v.minValue(1))

export const number = validate(v.number())
export const string = validate(v.string())
export const boolean = validate(v.boolean())

export const nullableString = validate(v.nullable(v.string()))
export const nullableNumber = validate(v.nullable(v.number()))
export const nullableInteger = validate(v.nullable(integer))

export const uint8 = validate(v.pipe(uint, v.maxValue(255)))
export const uint16 = validate(v.pipe(uint, v.maxValue(65535)))
export const mediumint = validate(v.pipe(uint, v.maxValue(16777215)))
export const percent = validate(v.pipe(v.number(), v.minValue(0), v.maxValue(100)))

export const positiveInt = validate(positiveInteger)
export const nullableUint = validate(v.nullable(uint))
export const nullableUint8 = validate(v.nullable(v.pipe(uint, v.maxValue(255))))
export const nullableUint16 = validate(v.nullable(v.pipe(uint, v.maxValue(65535))))

export const char = (max: number) => validate(v.pipe(v.string(), v.maxLength(max)))
export const varchar = char
export const nullableChar = (max: number) => validate(v.nullable(v.pipe(v.string(), v.maxLength(max))))
export const nullableVarchar = nullableChar

export const numberInRange = (min: number, max: number) =>
  validate(v.pipe(v.number(), v.minValue(min), v.maxValue(max)))

export const enumValue = <T extends Record<string, string>>(enumObj: T) =>
  validate(v.picklist(Object.values(enumObj) as [string, ...string[]]))
