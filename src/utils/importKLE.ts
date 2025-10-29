export interface KLEKey {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotationCenter: { x: number; y: number };
  rotationAngle: number;
  label?: string;
  binding?: string;
}

export function importKLE(kleJson: any[]): KLEKey[] {
  const keys: KLEKey[] = [];
  let currentRotation = 0;
  let rotationOrigin = { x: 0, y: 0 };
  let cursor = { x: 0, y: 0 };

  for (const row of kleJson) {
    if (!Array.isArray(row)) continue;
    cursor.x = 0;
    for (const item of row) {
      if (typeof item === "object" && !item?.labels) {
        if (item.r !== undefined) currentRotation = item.r;
        if (item.rx !== undefined) rotationOrigin.x = item.rx;
        if (item.ry !== undefined) rotationOrigin.y = item.ry;
        if (item.x !== undefined) cursor.x += item.x;
        if (item.y !== undefined) cursor.y += item.y;
        continue;
      }
      const label = typeof item === "string" ? item : item?.labels?.[0] ?? "";
      keys.push({
        id: crypto.randomUUID(),
        x: cursor.x,
        y: cursor.y,
        w: 1,
        h: 1,
        rotationCenter: { ...rotationOrigin },
        rotationAngle: currentRotation,
        label,
        binding: `&kp ${label || "NO"}`,
      });
      cursor.x += 1;
    }
    cursor.y += 1;
  }
  return keys;
}