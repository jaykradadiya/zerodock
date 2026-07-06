/** Simple fuzzy match — query chars must appear in order within the target. */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 100;
  if (t.includes(q)) return 50;
  return fuzzyMatch(q, t) ? 10 : 0;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string
): T[] {
  const q = query.trim();
  if (!q) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(q, getSearchText(item)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
