type Branded<T, B extends string> = T & { __brand: B }

export type EpochSeconds = Branded<number, 'EpochSeconds'>
export type EpochMilliseconds = Branded<number, 'EpochMilliseconds'>

export const asEpochSeconds = (n: number): EpochSeconds => n as EpochSeconds
export const asEpochMilliseconds = (n: number): EpochMilliseconds => n as EpochMilliseconds

export const sToMs = (s: EpochSeconds): EpochMilliseconds =>
  asEpochMilliseconds((s as number) * 1000)

export const msToS = (ms: EpochMilliseconds): EpochSeconds =>
  asEpochSeconds(Math.floor(ms as number / 1000))
