/**
 * Generate a round that differs from the previous one. Small levels (sums
 * within 5, fruit up to 5) repeat often, and after a miss on hard a "new"
 * round that looks identical reads as "nothing happened".
 */
export function freshRound<R>(generate: () => R, previous: R | undefined, key: (round: R) => string, tries = 10): R {
  let next = generate();
  if (previous === undefined) return next;
  const prevKey = key(previous);
  for (let i = 0; i < tries && key(next) === prevKey; i++) next = generate();
  return next;
}
