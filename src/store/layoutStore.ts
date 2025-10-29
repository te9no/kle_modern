import { create } from "zustand";

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

interface LayoutState {
  keys: KLEKey[];
  selectedKeys: string[];
  setKeys: (k: KLEKey[]) => void;
  updateKey: (id: string, patch: Partial<KLEKey>) => void;
  toggleSelect: (id: string) => void;
  rotateSelected: (angle: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  keys: [],
  selectedKeys: [],
  setKeys: (keys) => set({ keys }),
  updateKey: (id, patch) =>
    set((state) => ({
      keys: state.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    })),
  toggleSelect: (id) =>
    set((state) => ({
      selectedKeys: state.selectedKeys.includes(id)
        ? state.selectedKeys.filter((i) => i !== id)
        : [...state.selectedKeys, id],
    })),
  rotateSelected: (angle) =>
    set((state) => ({
      keys: state.keys.map((k) =>
        state.selectedKeys.includes(k.id)
          ? { ...k, rotationAngle: (k.rotationAngle + angle) % 360 }
          : k
      ),
    })),
}));