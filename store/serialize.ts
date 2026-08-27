/**
 * Serialises read-modify-write sequences against a storage key.
 *
 * AsyncStorage has no atomic update, so "load, merge, save" is a race: two
 * mutations fired in the same tick both read the pre-update value and the
 * second one's save silently discards the first. That is not hypothetical —
 * changing two settings in quick succession loses one of them, and adding two
 * holdings quickly loses one.
 *
 * Each key gets its own promise chain, so writes to it run strictly in order
 * while unrelated keys stay independent.
 */
const chains = new Map<string, Promise<unknown>>();

export function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  // Swallow the predecessor's rejection so one failure does not poison the
  // queue for every later write.
  const next = previous.then(operation, operation);
  chains.set(key, next.catch(() => undefined));
  return next;
}
