import { v7, validate, version } from 'uuid'

/** Time-ordered UUIDv7, used for event ids and cdp primary keys (ADR-0003, ADR-0009). */
export const uuidv7 = (): string => v7()

export const isUuidV7 = (value: string): boolean => validate(value) && version(value) === 7
