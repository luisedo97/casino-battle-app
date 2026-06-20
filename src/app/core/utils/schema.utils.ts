/** Convierte ArraySchema / colecciones Colyseus a array JS. */
export function schemaToArray<T>(
  collection: T[] | { length?: number; [index: number]: T } | null | undefined
): T[] {
  if (!collection) return [];

  if (Array.isArray(collection)) {
    return collection;
  }

  const length = collection.length ?? 0;
  const items: T[] = [];

  for (let i = 0; i < length; i++) {
    const item = collection[i];
    if (item !== undefined) {
      items.push(item);
    }
  }

  return items;
}
