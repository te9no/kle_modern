export interface KLEKey {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotationCenter: { x: number; y: number };
  rotationAngle: number;
  labels: string[];
  label?: string;
  binding?: string;
}

type KleState = {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  rx: number;
  ry: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasLabels = (value: unknown): value is { labels: string[] } =>
  isObject(value) && Array.isArray(value.labels);

const applyConfig = (state: KleState, config: Record<string, unknown>) => {
  if (typeof config.r === "number") {
    state.r = config.r;
  }
  if (typeof config.rx === "number") {
    state.rx = config.rx;
    state.x = config.rx;
    state.y = state.ry;
  }
  if (typeof config.ry === "number") {
    state.ry = config.ry;
    state.y = config.ry;
  }
  if (typeof config.x === "number") {
    state.x += config.x;
  }
  if (typeof config.y === "number") {
    state.y += config.y;
  }
  if (typeof config.w === "number") {
    state.w = config.w;
  }
  if (typeof config.h === "number") {
    state.h = config.h;
  }
};

const extractLabel = (item: unknown): string => {
  if (typeof item === "string") {
    return item;
  }

  if (hasLabels(item)) {
    return item.labels.find((label) => Boolean(label?.trim())) ?? "";
  }

  return "";
};

const extractLabels = (item: unknown): string[] => {
  const labels = Array(9).fill("");

  if (typeof item === "string") {
    labels[4] = item;
    return labels;
  }

  if (hasLabels(item)) {
    for (let i = 0; i < Math.min(9, item.labels.length); i += 1) {
      labels[i] = item.labels[i] ?? "";
    }
  }

  return labels;
};

const toBinding = (label: string) => {
  const trimmed = label.trim();
  return `&kp ${trimmed || "NO"}`;
};

export function importKLE(raw: any[]): KLEKey[] {
  const keys: KLEKey[] = [];

  const state: KleState = { x: 0, y: 0, w: 1, h: 1, r: 0, rx: 0, ry: 0 };

  for (const row of raw) {
    if (!Array.isArray(row)) continue;

    state.x = state.rx;

    for (const item of row) {
      if (hasLabels(item)) {
        applyConfig(state, item);

        const labels = extractLabels(item);
        const label = labels[4] || extractLabel(item);
        keys.push({
          id: crypto.randomUUID(),
          x: state.x,
          y: state.y,
          w: state.w,
          h: state.h,
          rotationCenter: { x: state.rx, y: state.ry },
          rotationAngle: state.r,
          labels,
          label,
          binding: toBinding(label),
        });

        state.x += state.w;
        state.w = 1;
        state.h = 1;
        continue;
      }

      if (typeof item === "string") {
        const labels = extractLabels(item);
        const label = labels[4] || item;
        keys.push({
          id: crypto.randomUUID(),
          x: state.x,
          y: state.y,
          w: state.w,
          h: state.h,
          rotationCenter: { x: state.rx, y: state.ry },
          rotationAngle: state.r,
          labels,
          label,
          binding: toBinding(label),
        });

        state.x += state.w;
        state.w = 1;
        state.h = 1;
        continue;
      }

      if (isObject(item)) {
        applyConfig(state, item);
      }
    }

    state.y += 1;
    state.x = state.rx;
  }

  return keys;
}
