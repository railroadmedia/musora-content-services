import { SyncError } from './index'


export function throwIfNotNumber(val: any) {
  if (typeof val !== 'number') throw new SyncError('Sync value is not a number: ' + val);
  return val
}

export function throwIfNotString(val: any) {
  if (typeof val !== 'string') throw new SyncError('Sync value is not a string: ' + val);
  return val
}

export function throwIfNotBoolean(val: any) {
  if (typeof val !== 'boolean') throw new SyncError('Sync value is not a boolean: ' + val);
  return val
}

export function throwIfNotNullableNumber(val: any) {
  return val === null ? val : throwIfNotNumber(val)
}

export function throwIfNotNullableString(val: any) {
  return val === null ? val : throwIfNotString(val)
}

export function throwIfOutsideRange(val: number, minimum?: number, maximum?: number) {
  if (minimum !== undefined && val < minimum) throw new SyncError('Sync value is less than minimum value ' + minimum + ': ' + val);
  if (maximum !== undefined && val > maximum) throw new SyncError('Sync value is greater than maximum value ' + maximum + ': ' + val);
  return val
}

export function throwIfMaxLengthExceeded(val: string, maximum: number) {
  if (val.length > maximum) throw new SyncError('Sync value exceeds the maximum length ' + maximum + ': ' + val);
  return val
}

export function throwIfInvalidEnumValue(val: string, enumClass: any) {
  if (!Object.values(enumClass).includes(val)) throw new SyncError('Sync value is invalid enum value of type ' + enumClass + ': ' + val);
  return val
}
