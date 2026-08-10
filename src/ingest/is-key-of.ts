const isKeyOf = <const T extends Record<string, unknown>>(mapping: T, value: string): value is Extract<keyof T, string> => value in mapping;

const isOneOf = <const T>(values: readonly T[], value: unknown): value is T => (values as readonly unknown[]).includes(value);

export { isKeyOf, isOneOf };
