declare module 'node:assert/strict' {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(fn: () => unknown, error?: unknown): void;
  }
  const assert: Assert;
  export default assert;
}

declare const process: { cwd(): string };
