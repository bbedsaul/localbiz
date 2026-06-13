/**
 * Sørensen–Dice coefficient over character bigrams. 1 = identical, 0 = no
 * overlap. Good enough for "Joe's HVAC" vs "Joes HVAC LLC" style fuzziness
 * without pulling in a dependency.
 */
export function diceSimilarity(a: string, b: string): number {
  const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;

  const bigrams = (s: string): Map<string, number> => {
    const counts = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      counts.set(bg, (counts.get(bg) ?? 0) + 1);
    }
    return counts;
  };

  const xBigrams = bigrams(x);
  const yBigrams = bigrams(y);
  let overlap = 0;
  for (const [bg, count] of xBigrams) {
    overlap += Math.min(count, yBigrams.get(bg) ?? 0);
  }
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}
