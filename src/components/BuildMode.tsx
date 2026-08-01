import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DoorOpen, Music, Utensils, Building2, Ambulance, Bus, CircleParking,
  ShieldAlert, CircleX, Eraser, Trash2, Play, Upload, Download, Search,
} from 'lucide-react';
import { useBuildStore, DEFAULT_CAPACITIES, type PlaceableType } from '../store/useBuildStore';

const TOOL_DEFS: { type: PlaceableType; label: string; icon: React.ReactNode; colour: string }[] = [
  { type: 'entrance', label: 'Entrance', icon: <DoorOpen size={16} />, colour: '#3a8a5a' },
  { type: 'exit', label: 'Exit', icon: <CircleX size={16} />, colour: '#4a7a9a' },
  { type: 'emergency_exit', label: 'Emergency Exit', icon: <ShieldAlert size={16} />, colour: '#e5c100' },
  { type: 'stage', label: 'Stage', icon: <Music size={16} />, colour: '#e63946' },
  { type: 'food', label: 'Food', icon: <Utensils size={16} />, colour: '#6b7a4a' },
  { type: 'toilet', label: 'Toilet', icon: <Building2 size={16} />, colour: '#555555' },
  { type: 'medical', label: 'Medical', icon: <Ambulance size={16} />, colour: '#e63946' },
  { type: 'transport', label: 'Transport', icon: <Bus size={16} />, colour: '#4a7a9a' },
  { type: 'parking', label: 'Parking', icon: <CircleParking size={16} />, colour: '#444444' },
  { type: 'barrier', label: 'Barrier', icon: <Eraser size={16} />, colour: '#e5c100' },
];

const MARKER_COLOURS: Record<PlaceableType, string> = {
  entrance: '#3a8a5a',
  exit: '#4a7a9a',
  emergency_exit: '#e5c100',
  stage: '#e63946',
  food: '#6b7a4a',
  toilet: '#555555',
  medical: '#e63946',
  transport: '#4a7a9a',
  parking: '#444444',
  barrier: '#e5c100',
};

interface Props {
  onRun: () => void;
}

export function BuildMode({ onRun }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Layer>>(new Map());
  const barrierStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const tempLineRef = useRef<L.Layer | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const store = useBuildStore();

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('build-map', {
      center: [store.mapCenter.lat, store.mapCenter.lng],
      zoom: store.mapZoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('moveend', () => {
      const c = map.getCenter();
      useBuildStore.getState().setMapCenter({ lat: c.lat, lng: c.lng });
    });
    map.on('zoomend', () => {
      useBuildStore.getState().setMapZoom(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const s = useBuildStore.getState();
      if (!s.selectedTool) return;
      const type = s.selectedTool;

      if (type === 'barrier') {
        // Barrier: click-click flow — first click sets start, second sets end
        if (!barrierStartRef.current) {
          barrierStartRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
          // Show temp marker at start
          const startIcon = L.divIcon({
            className: 'build-marker',
            html: `<div style="width:10px;height:10px;border-radius:50%;background:#e5c100;border:2px solid #000;"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          tempLineRef.current = L.marker([e.latlng.lat, e.latlng.lng], { icon: startIcon }).addTo(map);
        } else {
          const start = barrierStartRef.current;
          const endLat = e.latlng.lat;
          const endLng = e.latlng.lng;
          // Compute midpoint and rotation
          const midLat = (start.lat + endLat) / 2;
          const midLng = (start.lng + endLng) / 2;
          // Rotation: angle from start to end in world coords
          const METERS_PER_LAT = 111320;
          const center = s.mapCenter;
          const dx = (endLng - start.lng) * METERS_PER_LAT * Math.cos(center.lat * Math.PI / 180);
          const dz = (endLat - start.lat) * METERS_PER_LAT;
          const rotation = Math.atan2(dz, dx) * 180 / Math.PI;
          const length = Math.hypot(dx, dz);

          s.addObject({
            id: `barrier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'barrier',
            lat: midLat,
            lng: midLng,
            x: 0,
            z: 0,
            rotation,
            capacity: length,
          });

          barrierStartRef.current = null;
          if (tempLineRef.current) {
            tempLineRef.current.remove();
            tempLineRef.current = null;
          }
        }
      } else {
        s.addObject({
          id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          x: 0,
          z: 0,
          rotation: 0,
          capacity: DEFAULT_CAPACITIES[type],
        });
      }
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (barrierStartRef.current && tempLineRef.current) {
        // Update temp line from start to mouse position
        const start = barrierStartRef.current;
        if (tempLineRef.current instanceof L.Polyline) {
          tempLineRef.current.setLatLngs([[start.lat, start.lng], [e.latlng.lat, e.latlng.lng]]);
        } else {
          // Replace marker with polyline
          tempLineRef.current.remove();
          tempLineRef.current = L.polyline([[start.lat, start.lng], [e.latlng.lat, e.latlng.lng]], {
            color: '#e5c100', weight: 3, opacity: 0.6, dashArray: '5,5',
          }).addTo(map);
        }
      }
    });

    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      // Cancel barrier placement on right-click
      if (barrierStartRef.current) {
        barrierStartRef.current = null;
        if (tempLineRef.current) { tempLineRef.current.remove(); tempLineRef.current = null; }
        return;
      }
      useBuildStore.getState().removeObjectAt(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const storeIds = new Set(store.objects.map((o) => o.id));

    for (const [id, layer] of existing) {
      if (!storeIds.has(id)) {
        layer.remove();
        existing.delete(id);
      }
    }

    for (const obj of store.objects) {
      if (existing.has(obj.id)) {
        const layer = existing.get(obj.id)!;
        if (obj.type === 'barrier' && layer instanceof L.Polyline) {
          // Update barrier line endpoints
          const halfLen = obj.capacity / 2;
          const rad = obj.rotation * Math.PI / 180;
          const dx = Math.cos(rad + Math.PI / 2) * halfLen;
          const dz = Math.sin(rad + Math.PI / 2) * halfLen;
          const center = store.mapCenter;
          const lat1 = center.lat + (obj.z - dz) / 111320;
          const lng1 = center.lng + (obj.x - dx) / (111320 * Math.cos(center.lat * Math.PI / 180));
          const lat2 = center.lat + (obj.z + dz) / 111320;
          const lng2 = center.lng + (obj.x + dx) / (111320 * Math.cos(center.lat * Math.PI / 180));
          layer.setLatLngs([[lat1, lng1], [lat2, lng2]]);
        } else if (!(obj.type === 'barrier') && layer instanceof L.Marker) {
          layer.setLatLng([obj.lat, obj.lng]);
        }
      } else {
        const colour = MARKER_COLOURS[obj.type] ?? '#444444';

        if (obj.type === 'barrier') {
          // Draw barrier as polyline
          const halfLen = obj.capacity / 2;
          const rad = obj.rotation * Math.PI / 180;
          const dx = Math.cos(rad + Math.PI / 2) * halfLen;
          const dz = Math.sin(rad + Math.PI / 2) * halfLen;
          const center = store.mapCenter;
          const lat1 = center.lat + (obj.z - dz) / 111320;
          const lng1 = center.lng + (obj.x - dx) / (111320 * Math.cos(center.lat * Math.PI / 180));
          const lat2 = center.lat + (obj.z + dz) / 111320;
          const lng2 = center.lng + (obj.x + dx) / (111320 * Math.cos(center.lat * Math.PI / 180));
          const line = L.polyline([[lat1, lng1], [lat2, lng2]], {
            color: colour, weight: 4, opacity: 0.8,
          }).addTo(map);
          line.bindTooltip('barrier', { permanent: false, direction: 'top' });
          existing.set(obj.id, line);
        } else {
          const sizeMap: Record<string, number> = { stage: 20, entrance: 16, exit: 16, emergency_exit: 16 };
          const sz = sizeMap[obj.type] ?? 12;
          const label = obj.type.replace(/_/g, ' ');
          const icon = L.divIcon({
            className: 'build-marker',
            html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${colour};border:2px solid #000;box-shadow:0 0 6px ${colour}99;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:bold;">${label[0].toUpperCase()}</div>`,
            iconSize: [sz, sz],
            iconAnchor: [sz / 2, sz / 2],
          });
          const marker = L.marker([obj.lat, obj.lng], { icon }).addTo(map);
          marker.bindTooltip(label, { permanent: false, direction: 'top' });
          existing.set(obj.id, marker);
        }
      }
    }
  }, [store.objects, store.mapCenter]);

  const handleSearch = () => {
    const query = searchRef.current?.value.trim();
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          mapRef.current?.setView([parseFloat(lat), parseFloat(lon)], 16);
          store.setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
        }
      })
      .catch(() => {});
  };

  const handleExport = () => {
    const data = JSON.stringify(store.getWorldDefinition(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crowdflux-world.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.objects) {
            useBuildStore.setState({
              objects: data.objects,
              targetPopulation: data.targetPopulation ?? 5000,
              weather: data.weather ?? 0,
              seed: data.seed ?? 42,
              mapCenter: data.mapCenter ?? { lat: 51.5074, lng: -0.1278 },
              mapZoom: data.mapZoom ?? 15,
            });
            if (data.mapCenter) {
              mapRef.current?.setView([data.mapCenter.lat, data.mapCenter.lng], data.mapZoom ?? 15);
            }
          }
        } catch {
          // ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const hasEntrance = store.objects.some((o) => o.type === 'entrance');
  const hasExit = store.objects.some((o) => o.type === 'exit' || o.type === 'emergency_exit');
  const hasStage = store.objects.some((o) => o.type === 'stage');
  const canRun = hasEntrance && hasExit && hasStage;

  return (
    <div className="build-mode">
      <div className="build-palette">
        <div className="palette-title">Build Mode</div>
        <div className="palette-subtitle">Search a location, then click on the map to place objects</div>

        <div className="search-bar">
          <Search size={14} className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search location..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>Go</button>
        </div>

        <div className="palette-divider" />

        <div className="palette-tools">
          {TOOL_DEFS.map((def) => (
            <button
              key={def.type}
              className={`palette-tool ${store.selectedTool === def.type ? 'active' : ''}`}
              onClick={() => store.setSelectedTool(store.selectedTool === def.type ? null : def.type)}
            >
              <span className="tool-icon" style={{ color: def.colour }}>{def.icon}</span>
              <span className="tool-label">{def.label}</span>
            </button>
          ))}
        </div>

        <div className="palette-divider" />

        <div className="palette-section">
          <label>Target Population</label>
          <input
            type="number"
            min={100}
            max={50000}
            value={store.targetPopulation}
            onChange={(e) => store.setTargetPopulation(Number(e.target.value))}
          />
        </div>

        <div className="palette-section">
          <label>Weather: {store.weather.toFixed(2)}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={store.weather}
            onChange={(e) => store.setWeather(Number(e.target.value))}
          />
        </div>

        <div className="palette-section">
          <label>Seed</label>
          <input
            type="number"
            value={store.seed}
            onChange={(e) => store.setSeed(Number(e.target.value))}
          />
        </div>

        <div className="palette-divider" />

        <div className="palette-actions">
          <button className="palette-btn" onClick={() => store.loadPreset('festival')}>
            <Upload size={14} />
            <span>Load Preset</span>
          </button>
          <button className="palette-btn" onClick={handleExport}>
            <Download size={14} />
            <span>Export</span>
          </button>
          <button className="palette-btn" onClick={handleImport}>
            <Upload size={14} />
            <span>Import</span>
          </button>
          <button className="palette-btn danger" onClick={() => store.clearAll()}>
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        </div>

        <div className="palette-divider" />

        <div className="palette-stats">
          <div className="stat-row">
            <span>Objects placed</span>
            <span className="stat-val">{store.objects.length}</span>
          </div>
          <div className="stat-row">
            <span>Entrances</span>
            <span className="stat-val">{store.objects.filter((o) => o.type === 'entrance').length}</span>
          </div>
          <div className="stat-row">
            <span>Exits</span>
            <span className="stat-val">{store.objects.filter((o) => o.type === 'exit' || o.type === 'emergency_exit').length}</span>
          </div>
          <div className="stat-row">
            <span>Stages</span>
            <span className="stat-val">{store.objects.filter((o) => o.type === 'stage').length}</span>
          </div>
        </div>

        {!canRun && (
          <div className="palette-warning">
            {!hasEntrance && 'Add at least one entrance.'}
            {!hasExit && hasEntrance && 'Add at least one exit.'}
            {!hasStage && hasEntrance && hasExit && 'Add at least one stage.'}
          </div>
        )}

        <button
          className="run-btn"
          disabled={!canRun}
          onClick={onRun}
        >
          <Play size={16} />
          <span>Run Simulation</span>
        </button>
      </div>

      <div className="build-map-wrap">
        <div id="build-map" className="build-map" />
        <div className="map-hint">
          {store.selectedTool === 'barrier'
            ? 'Click first point, then click second point to draw barrier · Right-click to cancel'
            : store.selectedTool
              ? `Click on the map to place ${store.selectedTool.replace(/_/g, ' ')} · Right-click to remove`
              : 'Select a tool from the left panel, then click on the map to place it'}
        </div>
      </div>
    </div>
  );
}
