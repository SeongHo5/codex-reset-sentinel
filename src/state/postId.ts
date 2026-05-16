export function comparePostIds(a: string, b: string): number {
  const left = BigInt(a);
  const right = BigInt(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function maxPostId(ids: string[]): string | null {
  if (ids.length === 0) return null;
  return ids.reduce((max, id) => (comparePostIds(id, max) > 0 ? id : max), ids[0]!);
}
