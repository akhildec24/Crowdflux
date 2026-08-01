import { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pause, Play, AlertTriangle, Users, Activity, TrendingUp, Flame, ArrowRight } from 'lucide-react';
import { useBuildStore, type PlacedObject } from '../store/useBuildStore';
import { getMarkerIcon, getMarkerSize, getObjectPopupHtml } from '../utils/mapIcons';
import type { Snapshot, ServerMetrics } from '../net/types';

const METERS_PER_LAT = 111320;

function worldToLatLng(x: number, z: number, center: { lat: number; lng: number }): [number, number] {
  const lat = center.lat + z / METERS_PER_LAT;
  const lng = center.lng + x / (METERS_PER_LAT * Math.cos(center.lat * Math.PI / 180));
  return [lat, lng];
}

const MARKER_COLOURS: Record<string, string> = {
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

const STATE_COLOURS: Record<number, string> = {
  0: '#3a8a5a',
  1: '#4a9ad4',
  2: '#e5c100',
  3: '#888888',
  4: '#4a7a9a',
  5: '#e63946',
  6: '#ff0000',
};

const STATE_LABELS: Record<number, string> = {
  0: 'Entering',
  1: 'Moving',
  2: 'Queuing',
  3: 'At Destination',
  4: 'Leaving',
  5: 'Evacuating',
  6: 'Panicking',
};

function dist(a: PlacedObject, b: PlacedObject): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function nearestOfType(obj: PlacedObject, objects: PlacedObject[], types: string[]): PlacedObject | null {
  let best: PlacedObject | null = null;
  let bestDist = Infinity;
  for (const o of objects) {
    if (!types.includes(o.type)) continue;
    if (o.id === obj.id) continue;
    const d = dist(obj, o);
    if (d < bestDist) { bestDist = d; best = o; }
  }
  return best;
}

function arrowHeadLatLng(from: [number, number], to: [number, number], size: number): [[number, number], [number, number]] {
  const dx = to[1] - from[1];
  const dy = to[0] - from[0];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return [to, to];
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular
  const px = -uy;
  const py = ux;
  // Arrowhead base point (back from tip)
  const bx = to[1] - ux * size;
  const by = to[0] - uy * size;
  // Two wing points
  const w1: [number, number] = [by + py * size * 0.6, bx + px * size * 0.6];
  const w2: [number, number] = [by - py * size * 0.6, bx - px * size * 0.6];
  return [w1, w2];
}

interface Props {
  snapshot: Snapshot | null;
  metrics: ServerMetrics | null;
  paused: boolean;
  onTogglePause: () => void;
  onExit: () => void;
}

export function MapSimulation({ snapshot, metrics, paused, onTogglePause, onExit }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const objectLayerRef = useRef<L.LayerGroup | null>(null);
  const flowLayerRef = useRef<L.LayerGroup | null>(null);
  const agentLayerRef = useRef<L.LayerGroup | null>(null);
  const densityLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [mapOpacity, setMapOpacity] = useState(0.4);
  const [noDataWarning, setNoDataWarning] = useState(false);
  const store = useBuildStore();

  // Initialise map
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('sim-map', {
      center: [store.mapCenter.lat, store.mapCenter.lng],
      zoom: store.mapZoom,
      zoomControl: false,
      attributionControl: true,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      opacity: 0.4,
    }).addTo(map);
    tileLayerRef.current = tiles;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    flowLayerRef.current = L.layerGroup().addTo(map);
    objectLayerRef.current = L.layerGroup().addTo(map);
    densityLayerRef.current = L.layerGroup().addTo(map);
    agentLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    // Invalidate map size when container resizes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(map.getContainer());
  }, []);

  // No-data warning timer
  useEffect(() => {
    if (snapshot) {
      setNoDataWarning(false);
      return;
    }
    const timer = setTimeout(() => setNoDataWarning(true), 3000);
    return () => clearTimeout(timer);
  }, [snapshot]);

  // Draw flow arrows between objects
  useEffect(() => {
    const map = mapRef.current;
    const flowLayer = flowLayerRef.current;
    if (!map || !flowLayer) return;

    flowLayer.clearLayers();
    if (!showFlow) return;

    const center = store.mapCenter;
    const objects = store.objects;

    // Entrance → Stage (green arrows)
    for (const ent of objects.filter(o => o.type === 'entrance')) {
      const stage = nearestOfType(ent, objects, ['stage']);
      if (stage) {
        drawFlowArrow(map, flowLayer, [ent.lat, ent.lng], [stage.lat, stage.lng], '#3a8a5a');
      }
    }

    // Stage → Food (orange arrows)
    for (const stage of objects.filter(o => o.type === 'stage')) {
      const food = nearestOfType(stage, objects, ['food']);
      if (food) {
        drawFlowArrow(map, flowLayer, [stage.lat, stage.lng], [food.lat, food.lng], '#e59500');
      }
      const toilet = nearestOfType(stage, objects, ['toilet']);
      if (toilet) {
        drawFlowArrow(map, flowLayer, [stage.lat, stage.lng], [toilet.lat, toilet.lng], '#e59500');
      }
    }

    // Stage → Exit (blue arrows)
    for (const stage of objects.filter(o => o.type === 'stage')) {
      const exit = nearestOfType(stage, objects, ['exit', 'emergency_exit']);
      if (exit) {
        drawFlowArrow(map, flowLayer, [stage.lat, stage.lng], [exit.lat, exit.lng], '#4a7a9a');
      }
    }

    // Entrance → Transport (cyan arrows)
    for (const ent of objects.filter(o => o.type === 'entrance')) {
      const transport = nearestOfType(ent, objects, ['transport']);
      if (transport) {
        drawFlowArrow(map, flowLayer, [ent.lat, ent.lng], [transport.lat, transport.lng], '#00bcd4');
      }
    }
  }, [store.objects, store.mapCenter, showFlow]);

  // Place object markers and barriers
  useEffect(() => {
    const map = mapRef.current;
    const layer = objectLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Count agents near each object (within 30m)
    const agentCounts = new Map<string, number>();
    if (snapshot?.agents) {
      for (const obj of store.objects) {
        let count = 0;
        for (const agent of snapshot.agents) {
          const d = Math.hypot(agent.x - obj.x, agent.z - obj.z);
          if (d < 30) count++;
        }
        agentCounts.set(obj.id, count);
      }
    }

    for (const obj of store.objects) {
      const colour = MARKER_COLOURS[obj.type] ?? '#444444';
      const label = obj.type.replace(/_/g, ' ');

      if (obj.type === 'barrier') {
        const halfLen = (obj.capacity || 10) / 2;
        const rad = obj.rotation * Math.PI / 180;
        const dx = Math.cos(rad) * halfLen;
        const dz = Math.sin(rad) * halfLen;
        const lat1 = obj.lat - dz / 111320;
        const lng1 = obj.lng - dx / (111320 * Math.cos(obj.lat * Math.PI / 180));
        const lat2 = obj.lat + dz / 111320;
        const lng2 = obj.lng + dx / (111320 * Math.cos(obj.lat * Math.PI / 180));

        L.polyline([[lat1, lng1], [lat2, lng2]], {
          color: colour, weight: 4, opacity: 0.8,
        }).addTo(layer);
      } else {
        const sz = getMarkerSize(obj.type);
        const icon = L.divIcon({
          className: 'sim-marker',
          html: getMarkerIcon(obj.type, sz),
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });
        const marker = L.marker([obj.lat, obj.lng], { icon }).addTo(layer);
        marker.bindTooltip(`${label} (cap: ${obj.capacity})`, { permanent: false, direction: 'top' });

        const nearby = agentCounts.get(obj.id) ?? 0;
        const extra: Record<string, string> = {};
        if (snapshot) {
          extra['Agents nearby'] = `${nearby}`;
          extra['Sim tick'] = `${snapshot.tick}`;
        }
        marker.bindPopup(getObjectPopupHtml(obj, extra), { closeButton: true, maxWidth: 250 });
      }
    }
  }, [store.objects, store.mapCenter, snapshot]);

  // Update agents, density, and incidents when snapshot changes
  useEffect(() => {
    const map = mapRef.current;
    const agentLayer = agentLayerRef.current;
    const densityLayer = densityLayerRef.current;
    const incidentLayer = incidentLayerRef.current;
    if (!map || !agentLayer || !densityLayer || !incidentLayer) return;
    if (!snapshot) return;

    const center = useBuildStore.getState().mapCenter;

    // Density heatmap
    densityLayer.clearLayers();
    if (showHeatmap && snapshot.density_grid && snapshot.grid_width > 0 && snapshot.grid_height > 0) {
      const gw = snapshot.grid_width;
      const gh = snapshot.grid_height;
      const gridWorldSize = 200.0;
      const cellWorld = gridWorldSize / gw;

      for (let gz = 0; gz < gh; gz++) {
        for (let gx = 0; gx < gw; gx++) {
          const density = snapshot.density_grid[gz * gw + gx];
          if (density < 0.5) continue;

          const wx = (gx - gw / 2) * cellWorld;
          const wz = (gz - gh / 2) * cellWorld;
          const [lat, lng] = worldToLatLng(wx, wz, center);

          const intensity = Math.min(density / 8.0, 1.0);
          let colour: string;
          if (intensity < 0.5) {
            const t = intensity * 2;
            colour = `rgb(${Math.round(50 + t * 200)},${Math.round(200 - t * 50)},${Math.round(50 - t * 50)})`;
          } else {
            const t = (intensity - 0.5) * 2;
            colour = `rgb(250,${Math.round(150 - t * 130)},0)`;
          }

          L.circle([lat, lng], {
            radius: Math.max(cellWorld / 2, 5),
            color: colour,
            fillColor: colour,
            fillOpacity: 0.15 + intensity * 0.35,
            weight: 0,
            interactive: false,
          }).addTo(densityLayer);
        }
      }
    }

    // Agents as circle markers + direction arrows
    agentLayer.clearLayers();
    const agents = snapshot.agents;
    if (agents && agents.length > 0) {
      const zoom = map.getZoom();
      const agentRadius = zoom >= 17 ? 5 : zoom >= 15 ? 3.5 : zoom >= 13 ? 2.5 : 2;

      for (const agent of agents) {
        const [lat, lng] = worldToLatLng(agent.x, agent.z, center);
        const colour = STATE_COLOURS[agent.state] ?? '#888888';

        // Agent dot
        L.circleMarker([lat, lng], {
          radius: agentRadius,
          color: colour,
          fillColor: colour,
          fillOpacity: 0.9,
          weight: 0,
          interactive: false,
        }).addTo(agentLayer);

        // Direction arrow for moving agents
        const speed = Math.hypot(agent.vx, agent.vz);
        if (speed > 0.1 && (agent.state === 1 || agent.state === 0 || agent.state === 5)) {
          const angle = Math.atan2(agent.vz, agent.vx);
          const arrowLen = Math.min(speed * 4, 15); // meters
          const endX = agent.x + Math.cos(angle) * arrowLen;
          const endZ = agent.z + Math.sin(angle) * arrowLen;
          const [endLat, endLng] = worldToLatLng(endX, endZ, center);

          // Arrow line
          L.polyline([[lat, lng], [endLat, endLng]], {
            color: colour,
            weight: 2,
            opacity: 0.7,
            interactive: false,
          }).addTo(agentLayer);

          // Arrowhead
          const [w1, w2] = arrowHeadLatLng([lat, lng], [endLat, endLng], 0.00008);
          L.polyline([[endLat, endLng], w1], { color: colour, weight: 2, opacity: 0.7, interactive: false }).addTo(agentLayer);
          L.polyline([[endLat, endLng], w2], { color: colour, weight: 2, opacity: 0.7, interactive: false }).addTo(agentLayer);
        }
      }
    }

    // Incidents
    incidentLayer.clearLayers();
    if (snapshot.incidents && snapshot.incidents.length > 0) {
      for (const inc of snapshot.incidents) {
        if (!inc.active) continue;
        const [lat, lng] = worldToLatLng(inc.x, inc.z, center);

        L.circle([lat, lng], {
          radius: 30, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.2, weight: 2, interactive: false,
        }).addTo(incidentLayer);

        L.circleMarker([lat, lng], {
          radius: 5, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 1, weight: 0, interactive: false,
        }).addTo(incidentLayer);
      }
    }
  }, [snapshot, showHeatmap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const agentCount = snapshot?.agent_count ?? 0;
  const maxDensity = snapshot?.stats?.max_density ?? 0;
  const tps = metrics?.ticks_per_second ?? 0;
  const entered = snapshot?.stats?.agents_entered ?? 0;
  const exited = snapshot?.stats?.agents_exited ?? 0;

  // Count agents by state
  const stateCounts: Record<number, number> = {};
  if (snapshot?.agents) {
    for (const a of snapshot.agents) {
      stateCounts[a.state] = (stateCounts[a.state] ?? 0) + 1;
    }
  }

  return (
    <div className="map-sim">
      <div className="sim-sidebar">
        <div className="sim-sidebar-header">
          <div className="sim-title">CrowdFlux</div>
          <div className="sim-subtitle">Live Simulation</div>
        </div>

        <div className="sim-sidebar-section">
          <div className="sim-sidebar-label">Controls</div>
          <button className="sim-btn" onClick={onTogglePause}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button className={`sim-btn ${showHeatmap ? 'active' : ''}`} onClick={() => setShowHeatmap(!showHeatmap)}>
            <Flame size={14} />
            <span>Density {showHeatmap ? 'On' : 'Off'}</span>
          </button>
          <button className={`sim-btn ${showFlow ? 'active' : ''}`} onClick={() => setShowFlow(!showFlow)}>
            <ArrowRight size={14} />
            <span>Flow {showFlow ? 'On' : 'Off'}</span>
          </button>
        </div>

        <div className="sim-sidebar-section">
          <div className="sim-sidebar-label">Map Opacity</div>
          <div className="sim-opacity-control">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={mapOpacity}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMapOpacity(v);
                tileLayerRef.current?.setOpacity(v);
              }}
            />
            <span className="sim-opacity-value">{Math.round(mapOpacity * 100)}%</span>
          </div>
        </div>

        <div className="sim-sidebar-section">
          <div className="sim-sidebar-label">Live Stats</div>
          <div className="sim-stat-list">
            <div className="sim-stat-row">
              <Users size={13} />
              <span>Agents</span>
              <strong>{agentCount.toLocaleString()}</strong>
            </div>
            <div className="sim-stat-row">
              <TrendingUp size={13} />
              <span>Entered</span>
              <strong>{entered.toLocaleString()}</strong>
            </div>
            <div className="sim-stat-row">
              <span>Exited</span>
              <strong>{exited.toLocaleString()}</strong>
            </div>
            <div className="sim-stat-row">
              <Activity size={13} />
              <span>Max Density</span>
              <strong>{maxDensity.toFixed(1)}</strong>
            </div>
            <div className="sim-stat-row">
              <span>TPS</span>
              <strong>{tps.toFixed(0)}</strong>
            </div>
            {snapshot?.evacuation && (
              <div className="sim-stat-row evac-row">
                <AlertTriangle size={13} />
                <strong>EVACUATION ACTIVE</strong>
              </div>
            )}
          </div>
        </div>

        {agentCount > 0 && (
          <div className="sim-sidebar-section">
            <div className="sim-sidebar-label">Agent States</div>
            <div className="sim-state-list">
              {Object.entries(stateCounts).map(([state, count]) => (
                <div key={state} className="state-chip" style={{ borderColor: STATE_COLOURS[+state] ?? '#888' }}>
                  <span className="state-dot" style={{ background: STATE_COLOURS[+state] ?? '#888' }}></span>
                  <span>{STATE_LABELS[+state] ?? `State ${state}`}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sim-sidebar-section">
          <div className="sim-sidebar-label">Legend</div>
          <div className="sim-legend-list">
            <div className="legend-item"><span className="legend-dot" style={{ background: '#3a8a5a' }}></span>Entering</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#4a9ad4' }}></span>Moving</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#e5c100' }}></span>Queuing</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#888888' }}></span>At Destination</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#e63946' }}></span>Evacuating</div>
          </div>
        </div>

        <div className="sim-sidebar-footer">
          <div className="sim-tick-info">
            {snapshot ? `tick ${snapshot.tick} · ${snapshot.agents?.length ?? 0} agents` : 'waiting for data...'}
          </div>
          <button className="sim-exit-btn" onClick={onExit}>← Back to Build</button>
        </div>
      </div>

      <div className="sim-map-wrap">
        {noDataWarning && (
          <div className="sim-warning-floating">
            <AlertTriangle size={14} />
            <span>No data from server — check connection.</span>
          </div>
        )}
        <div id="sim-map" className="sim-map" />
      </div>
    </div>
  );
}

function drawFlowArrow(
  map: L.Map,
  layer: L.LayerGroup,
  from: [number, number],
  to: [number, number],
  colour: string,
) {
  // Dashed line
  L.polyline([from, to], {
    color: colour,
    weight: 2,
    opacity: 0.5,
    dashArray: '6,6',
    interactive: false,
  }).addTo(layer);

  // Arrowhead at the destination end
  const [w1, w2] = arrowHeadLatLng(from, to, 0.00012);
  L.polyline([to, w1], { color: colour, weight: 3, opacity: 0.7, interactive: false }).addTo(layer);
  L.polyline([to, w2], { color: colour, weight: 3, opacity: 0.7, interactive: false }).addTo(layer);
}
