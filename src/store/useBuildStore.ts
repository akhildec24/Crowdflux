import { create } from 'zustand';

export type PlaceableType =
  | 'entrance'
  | 'exit'
  | 'emergency_exit'
  | 'stage'
  | 'food'
  | 'toilet'
  | 'medical'
  | 'transport'
  | 'parking'
  | 'barrier';

export interface PlacedObject {
  id: string;
  type: PlaceableType;
  lat: number;
  lng: number;
  x: number; // derived world coords (relative to map center)
  z: number;
  rotation: number;
  capacity: number;
}

export interface WorldDefinition {
  objects: PlacedObject[];
  targetPopulation: number;
  weather: number;
  seed: number;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
}

interface BuildState {
  objects: PlacedObject[];
  selectedTool: PlaceableType | null;
  targetPopulation: number;
  weather: number;
  seed: number;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;

  setSelectedTool: (t: PlaceableType | null) => void;
  addObject: (obj: PlacedObject) => void;
  removeObject: (id: string) => void;
  removeObjectAt: (lat: number, lng: number) => void;
  clearAll: () => void;
  setTargetPopulation: (n: number) => void;
  setWeather: (w: number) => void;
  setSeed: (s: number) => void;
  setMapCenter: (c: { lat: number; lng: number }) => void;
  setMapZoom: (z: number) => void;
  getWorldDefinition: () => WorldDefinition;
  loadPreset: (preset: string) => void;
}

const METERS_PER_LAT = 111320;

function latLngToWorld(lat: number, lng: number, center: { lat: number; lng: number }): { x: number; z: number } {
  const x = (lng - center.lng) * METERS_PER_LAT * Math.cos(center.lat * Math.PI / 180);
  const z = (lat - center.lat) * METERS_PER_LAT;
  return { x, z };
}

const STORAGE_KEY = 'crowdflux-build-state';

function saveToStorage(state: { objects: PlacedObject[]; mapCenter: { lat: number; lng: number }; mapZoom: number; targetPopulation: number; weather: number; seed: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadFromStorage(): { objects: PlacedObject[]; mapCenter: { lat: number; lng: number }; mapZoom: number; targetPopulation: number; weather: number; seed: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const saved = loadFromStorage();

function persist(s: { objects: PlacedObject[]; mapCenter: { lat: number; lng: number }; mapZoom: number; targetPopulation: number; weather: number; seed: number }) {
  saveToStorage(s);
}

const DEFAULT_CAPACITIES: Record<PlaceableType, number> = {
  entrance: 50,
  exit: 80,
  emergency_exit: 100,
  stage: 3000,
  food: 200,
  toilet: 100,
  medical: 50,
  transport: 100,
  parking: 300,
  barrier: 0,
};

let idCounter = 0;
function genId(type: string): string {
  idCounter++;
  return `${type}_${idCounter}`;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  objects: saved?.objects ?? [],
  selectedTool: null,
  targetPopulation: saved?.targetPopulation ?? 5000,
  weather: saved?.weather ?? 0,
  seed: saved?.seed ?? 42,
  mapCenter: saved?.mapCenter ?? { lat: 51.5074, lng: -0.1278 },
  mapZoom: saved?.mapZoom ?? 15,

  setSelectedTool: (t) => set({ selectedTool: t }),
  addObject: (obj) => { set((s) => ({ objects: [...s.objects, obj] })); persist(get()); },
  removeObject: (id) => { set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })); persist(get()); },
  removeObjectAt: (lat, lng) =>
    set((s) => {
      let closest: PlacedObject | null = null;
      let closestDist = Infinity;
      for (const obj of s.objects) {
        const dist = Math.hypot(obj.lat - lat, obj.lng - lng);
        if (dist < 0.002 && dist < closestDist) {
          closest = obj;
          closestDist = dist;
        }
      }
      if (closest) {
        const objects = s.objects.filter((o) => o.id !== closest!.id);
        persist({ objects, mapCenter: s.mapCenter, mapZoom: s.mapZoom, targetPopulation: s.targetPopulation, weather: s.weather, seed: s.seed });
        return { objects };
      }
      return {};
    }),
  clearAll: () => { set({ objects: [] }); persist(get()); },
  setTargetPopulation: (n) => { set({ targetPopulation: n }); persist(get()); },
  setWeather: (w) => { set({ weather: w }); persist(get()); },
  setSeed: (s) => { set({ seed: s }); persist(get()); },
  setMapCenter: (c) => { set({ mapCenter: c }); persist(get()); },
  setMapZoom: (z) => { set({ mapZoom: z }); persist(get()); },

  getWorldDefinition: () => {
    const s = get();
    return {
      objects: s.objects.map((o) => ({
        ...o,
        ...latLngToWorld(o.lat, o.lng, s.mapCenter),
      })),
      targetPopulation: s.targetPopulation,
      weather: s.weather,
      seed: s.seed,
      mapCenter: s.mapCenter,
      mapZoom: s.mapZoom,
    };
  },

  loadPreset: (preset) => {
    idCounter = 0;
    switch (preset) {
      case 'festival': {
        const center = { lat: 51.5074, lng: -0.1278 };
        const mk = (type: PlaceableType, lat: number, lng: number, capacity: number): PlacedObject => {
          const w = latLngToWorld(lat, lng, center);
          return { id: genId(type), type, lat, lng, x: w.x, z: w.z, rotation: 0, capacity };
        };
        set({
          mapCenter: center,
          mapZoom: 15,
          objects: [
            mk('entrance', 51.5068, -0.1285, 50),
            mk('entrance', 51.5068, -0.1271, 50),
            mk('stage', 51.5078, -0.1278, 5000),
            mk('stage', 51.5074, -0.1265, 2000),
            mk('food', 51.5072, -0.1282, 200),
            mk('food', 51.5072, -0.1274, 200),
            mk('food', 51.5071, -0.1278, 150),
            mk('toilet', 51.5071, -0.1286, 100),
            mk('toilet', 51.5071, -0.1270, 100),
            mk('medical', 51.5076, -0.1290, 50),
            mk('transport', 51.5069, -0.1262, 100),
            mk('transport', 51.5069, -0.1294, 150),
            mk('parking', 51.5067, -0.1278, 300),
            mk('exit', 51.5068, -0.1290, 80),
            mk('exit', 51.5068, -0.1266, 80),
            mk('exit', 51.5074, -0.1298, 60),
            mk('exit', 51.5074, -0.1258, 60),
            mk('emergency_exit', 51.5080, -0.1288, 100),
            mk('emergency_exit', 51.5080, -0.1268, 100),
            mk('emergency_exit', 51.5070, -0.1278, 80),
          ],
          targetPopulation: 8000,
          weather: 0,
        });
        persist(get());
        break;
      }
      case 'empty':
        set({ objects: [], targetPopulation: 5000, weather: 0 });
        persist(get());
        break;
    }
  },
}));

export { DEFAULT_CAPACITIES };
