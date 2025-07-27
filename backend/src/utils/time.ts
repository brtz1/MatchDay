/**
 * Delays execution for a given number of milliseconds.
 * Use in async functions with `await sleep(ms)`
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
