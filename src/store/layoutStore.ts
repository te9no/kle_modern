import { create } from 'zustand';

export const DEFAULT_PITCH_MM = 19.05;

export interface KLEKey { id:string;x:number;y:number;w:number;h:number;rotationCenter:{x:number;y:number};rotationAngle:number;labels:string[];label?:string;binding?:string; }

const ensureLabels = (key: KLEKey): KLEKey => {
  if (Array.isArray(key.labels) && key.labels.length === 9) {
    return { ...key, labels: key.labels.map((v) => v ?? "") };
  }
  const labels = Array(9).fill("");
  if (Array.isArray(key.labels)) {
    for (let i=0;i<Math.min(9,key.labels.length);i+=1){
      labels[i]=key.labels[i]??"";
    }
  } else if (key.label) {
    labels[4]=key.label;
  }
  return { ...key, labels };
};
interface LayoutState {
  keys: KLEKey[];
  selectedKeys: string[];
  setKeys: (k: KLEKey[]) => void;
  updateKey: (id: string, patch: Partial<KLEKey>) => void;
  toggleSelect: (id: string) => void;
  rotateSelected: (a: number) => void;
  clearSelection: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  selectKey: (id: string) => void;
  unitPitch: number;
  setUnitPitch: (pitch: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  keys: [],
  selectedKeys: [],
  unitPitch: DEFAULT_PITCH_MM,
  setKeys: (keys) => set({ keys: keys.map(ensureLabels), selectedKeys: [] }),
  updateKey: (id, patch) =>
    set((s) => ({
      keys: s.keys.map((k) => (k.id === id ? ensureLabels({ ...k, ...patch }) : k)),
    })),
  toggleSelect: (id) =>
    set((s) => ({
      selectedKeys: s.selectedKeys.includes(id)
        ? s.selectedKeys.filter((i) => i !== id)
        : [...s.selectedKeys, id],
    })),
  rotateSelected: (a) =>
    set((s) => ({
      keys: s.keys.map((k) =>
        s.selectedKeys.includes(k.id)
          ? { ...k, rotationAngle: (k.rotationAngle + a) % 360 }
          : k
      ),
    })),
  clearSelection: () => set({ selectedKeys: [] }),
  nudgeSelected: (dx, dy) =>
    set((s) => ({
      keys: s.keys.map((k) =>
        s.selectedKeys.includes(k.id)
          ? {
              ...k,
              x: k.x + dx,
              y: k.y + dy,
              rotationCenter: {
                x: k.rotationCenter.x + dx,
                y: k.rotationCenter.y + dy,
              },
            }
        : k
      ),
    })),
  selectKey: (id) => set({ selectedKeys: [id] }),
  setUnitPitch: (pitch) =>
    set({
      unitPitch: Number.isFinite(pitch) && pitch > 0 ? pitch : DEFAULT_PITCH_MM,
    }),
}));
