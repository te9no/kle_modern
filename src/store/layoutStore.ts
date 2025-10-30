import { create } from "zustand";

export const DEFAULT_PITCH_MM = 19.05;

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

const ensureLabels = (key: KLEKey): KLEKey => {
  const labels = Array(9).fill("");
  if (Array.isArray(key.labels)) {
    for (let i = 0; i < Math.min(9, key.labels.length); i += 1) {
      labels[i] = key.labels[i] ?? "";
    }
  } else if (key.label) {
    labels[4] = key.label;
  }
  return {
    ...key,
    labels,
  };
};

const cloneKey = (key: KLEKey): KLEKey => ({
  ...key,
  rotationCenter: { ...key.rotationCenter },
  labels: [...key.labels],
});

const cloneKeys = (keys: KLEKey[]) => keys.map((k) => cloneKey(k));

const normalizeKeys = (keys: KLEKey[]) => keys.map((k) => cloneKey(ensureLabels(k)));

interface LayoutState {
  keys: KLEKey[];
  selectedKeys: string[];
  setKeys: (k: KLEKey[]) => void;
  updateKey: (id: string, patch: Partial<KLEKey>, options?: { skipHistory?: boolean }) => void;
  toggleSelect: (id: string) => void;
  rotateSelected: (a: number) => void;
  clearSelection: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  selectKey: (id: string) => void;
  setSelectedKeys: (ids: string[]) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  unitPitch: number;
  setUnitPitch: (pitch: number) => void;
  viewMode: "canvas" | "node";
  setViewMode: (mode: "canvas" | "node") => void;
  undo: () => void;
  redo: () => void;
  commitHistory: (snapshot: KLEKey[]) => void;
  past: KLEKey[][];
  future: KLEKey[][];
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  keys: [],
  selectedKeys: [],
  unitPitch: DEFAULT_PITCH_MM,
  viewMode: "canvas",
  past: [],
  future: [],
  setKeys: (keys) =>
    set({
      keys: normalizeKeys(keys),
      selectedKeys: [],
      past: [],
      future: [],
    }),
  updateKey: (id, patch, options) =>
    set((state) => {
      let changed = false;
      const keys = state.keys.map((k) => {
        if (k.id !== id) return k;
        const next = ensureLabels({
          ...k,
          ...patch,
          rotationCenter: patch?.rotationCenter
            ? { ...k.rotationCenter, ...patch.rotationCenter }
            : k.rotationCenter,
          labels: patch?.labels ? [...patch.labels] : k.labels,
        });
        changed =
          changed ||
          next.x !== k.x ||
          next.y !== k.y ||
          next.rotationAngle !== k.rotationAngle ||
          next.w !== k.w ||
          next.h !== k.h ||
          next.rotationCenter.x !== k.rotationCenter.x ||
          next.rotationCenter.y !== k.rotationCenter.y ||
          next.labels.some((label, index) => label !== k.labels[index]);
        return cloneKey(next);
      });

      if (!changed) {
        return state;
      }

      if (options?.skipHistory) {
        return {
          ...state,
          keys,
        };
      }

      return {
        ...state,
        keys,
        past: [...state.past, cloneKeys(state.keys)],
        future: [],
      };
    }),
  toggleSelect: (id) =>
    set((state) => ({
      selectedKeys: state.selectedKeys.includes(id)
        ? state.selectedKeys.filter((i) => i !== id)
        : [...state.selectedKeys, id],
    })),
  rotateSelected: (a) =>
    set((state) => {
      if (!state.selectedKeys.length) return state;
      const before = cloneKeys(state.keys);
      const keys = state.keys.map((k) =>
        state.selectedKeys.includes(k.id)
          ? cloneKey({ ...k, rotationAngle: (k.rotationAngle + a) % 360 })
          : k
      );
      return {
        ...state,
        keys,
        past: [...state.past, before],
        future: [],
      };
    }),
  clearSelection: () => set({ selectedKeys: [] }),
  nudgeSelected: (dx, dy) =>
    set((state) => {
      if (!state.selectedKeys.length) return state;
      const before = cloneKeys(state.keys);
      const keys = state.keys.map((k) =>
        state.selectedKeys.includes(k.id)
          ? cloneKey({
              ...k,
              x: k.x + dx,
              y: k.y + dy,
              rotationCenter: {
                x: k.rotationCenter.x + dx,
                y: k.rotationCenter.y + dy,
              },
            })
          : k
      );
      return {
        ...state,
        keys,
        past: [...state.past, before],
        future: [],
      };
    }),
  selectKey: (id) => set({ selectedKeys: [id] }),
  setSelectedKeys: (ids) =>
    set({
      selectedKeys: [...new Set(ids)],
    }),
  deleteSelected: () =>
    set((state) => {
      if (!state.selectedKeys.length) return state;
      const remaining = state.keys.filter((k) => !state.selectedKeys.includes(k.id));
      return {
        ...state,
        keys: cloneKeys(remaining),
        selectedKeys: [],
        past: [...state.past, cloneKeys(state.keys)],
        future: [],
      };
    }),
  duplicateSelected: () =>
    set((state) => {
      if (!state.selectedKeys.length) return state;
      const before = cloneKeys(state.keys);
      const selected = state.keys.filter((k) => state.selectedKeys.includes(k.id));
      const nextSelected: string[] = [];
      const copied = selected.map((key) => {
        const copy = cloneKey(key);
        copy.id = crypto.randomUUID();
        copy.x += 0.25;
        copy.y += 0.25;
        copy.rotationCenter = {
          x: copy.rotationCenter.x + 0.25,
          y: copy.rotationCenter.y + 0.25,
        };
        nextSelected.push(copy.id);
        return copy;
      });
      return {
        ...state,
        keys: cloneKeys([...state.keys, ...copied]),
        selectedKeys: nextSelected,
        past: [...state.past, before],
        future: [],
      };
    }),
  setUnitPitch: (pitch) =>
    set({
      unitPitch: Number.isFinite(pitch) && pitch > 0 ? pitch : DEFAULT_PITCH_MM,
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
  undo: () =>
    set((state) => {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      const remainingPast = state.past.slice(0, -1);
      return {
        ...state,
        keys: cloneKeys(previous),
        past: remainingPast,
        future: [cloneKeys(state.keys), ...state.future],
        selectedKeys: [],
      };
    }),
  redo: () =>
    set((state) => {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        keys: cloneKeys(next),
        past: [...state.past, cloneKeys(state.keys)],
        future: rest,
        selectedKeys: [],
      };
    }),
  commitHistory: (snapshot) =>
    set((state) => ({
      past: [...state.past, cloneKeys(snapshot)],
      future: [],
    })),
}));
