import { SyncValidationError } from './index'

export function throwIfNotInteger(val: any) {
  if (!Number.isSafeInteger(val)) throw new SyncValidationError('Sync value is not a number: ' + val, typeof val, 'number');
  return val
}

export function throwIfNotNumber(val: any) {
  // note: this will accept decimal values
  if (!Number.isFinite(val)) throw new SyncValidationError('Sync value is not a number: ' + val, typeof val, 'number');
  return val
}

export function throwIfNotString(val: any) {
  if (typeof val !== 'string') throw new SyncValidationError('Sync value is not a string: ' + val, typeof val, 'string');
  return val
}

export function throwIfNotBoolean(val: any) {
  if (typeof val !== 'boolean') throw new SyncValidationError('Sync value is not a boolean: ' + val, typeof val, 'boolean');
  return val
}

export function throwIfNotNullableInteger(val: any) {
  return val === null ? val : throwIfNotInteger(val)
}

export function throwIfNotNullableNumber(val: any) {
  return val === null ? val : throwIfNotNumber(val)
}

export function throwIfNotNullableString(val: any) {
  return val === null ? val : throwIfNotString(val)
}

export function throwIfOutsideRange(val: number, minimum?: number, maximum?: number) {
  if (minimum !== undefined && val < minimum) throw new SyncValidationError('Sync value is less than minimum value ' + minimum + ': ' + val, val, null);
  if (maximum !== undefined && val > maximum) throw new SyncValidationError('Sync value is greater than maximum value ' + maximum + ': ' + val, val, null);
  return val
}

export function throwIfMaxLengthExceeded(val: string, maximum: number) {
  if (val.length > maximum) throw new SyncValidationError('Sync value exceeds the maximum length ' + maximum + ': ' + val, val, null);
  return val
}

export function throwIfInvalidEnumValue(val: string, enumClass: any) {
  if (!Object.values(enumClass).includes(val)) throw new SyncValidationError('Sync value is invalid enum value: ' + val, val, enumClass);
  return val
}
