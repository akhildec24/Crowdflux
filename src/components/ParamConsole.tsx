import React, { useState } from 'react';
import {
  Users, CloudRain, Shield, HeartPulse, Megaphone, AlertTriangle,
  DoorOpen, Layers, Bookmark, Settings, Accessibility, Volume2,
  Zap, Eye, TriangleAlert, Siren, Camera, Map, Palette,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface Props {
  onCommand: (action: string, data?: any) => void;
}

export function ParamConsole({ onCommand }: Props) {
  const store = useStore();
  const [weatherIntensity, setWeatherIntensity] = useState(0);
  const [populationTarget, setPopulationTarget] = useState(8000);
  const [incidentKind, setIncidentKind] = useState('medical');
  const [incidentSeverity, setIncidentSeverity] = useState(0.5);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [transportCapacity, setTransportCapacity] = useState(100);
  const [attractionPopularity, setAttractionPopularity] = useState(0.5);
  const [seed, setSeed] = useState(42);

  const tool = store.selectedTool;

  const renderTool = () => {
    if (!tool) {
      return (
        <div>
          <div className="section-title">No Tool Selected</div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            Select a tool from the left rail to modify the environment, deploy resources, or trigger incidents.
          </p>
          <div className="divider" style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div className="section-title">Simulation Settings</div>
          <div className="control-group">
            <label htmlFor="seed">Random Seed</label>
            <input id="seed" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </div>
          <div className="control-group">
            <label htmlFor="pop-target">Agent Population Target</label>
            <input id="pop-target" type="number" value={populationTarget} min={100} max={50000} step={100}
              onChange={(e) => setPopulationTarget(Number(e.target.value))} />
            <div className="effect-preview">
              Estimated impact: {populationTarget.toLocaleString()} visitors. Higher populations increase density and queue times.
            </div>
          </div>
          <button className="btn" onClick={() => onCommand('set_population', { target: populationTarget })}>
            <Users size={14} />
            <span>Apply Population Target</span>
          </button>
        </div>
      );
    }

    switch (tool) {
      case 'barrier':
        return (
          <div>
            <div className="section-title">Barrier Tool</div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Click on the 3D environment to place a barrier. Barriers redirect crowd flow and block navigation routes.
            </p>
            <div className="control-group">
              <label>Barrier Length: 5m</label>
            </div>
            <div className="effect-preview">
              Barriers force path recalculation for nearby agents. Expect temporary congestion as routes update.
            </div>
          </div>
        );

      case 'entrance_exit':
        return (
          <div>
            <div className="section-title">Entrances & Exits</div>
            {store.snapshot?.entrances.map((ent) => (
              <div key={ent.id} className="control-group">
                <label>{ent.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`btn ${ent.open ? '' : 'danger'}`}
                    style={{ flex: 1 }}
                    onClick={() => onCommand('toggle_entrance', { id: ent.id, open: !ent.open })}
                  >
                    {ent.open ? 'Close' : 'Open'}
                  </button>
                </div>
                <div className="effect-preview">
                  Capacity: {ent.capacity} visitors/min. {ent.open ? 'Currently open.' : 'Currently closed.'}
                </div>
              </div>
            ))}
            {store.snapshot?.exits.map((exit) => (
              <div key={exit.id} className="control-group">
                <label>{exit.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`btn ${exit.open ? '' : 'danger'}`}
                    style={{ flex: 1 }}
                    onClick={() => onCommand('toggle_exit', { id: exit.id, open: !exit.open })}
                  >
                    {exit.open ? 'Close' : 'Open'}
                  </button>
                </div>
                <div className="effect-preview">
                  Capacity: {exit.capacity} visitors/min. {exit.open ? 'Currently open.' : 'Currently closed — routes will be recalculated.'}
                </div>
              </div>
            ))}
          </div>
        );

      case 'incident':
        return (
          <div>
            <div className="section-title">Incident Tool</div>
            <div className="control-group">
              <label htmlFor="incident-kind">Incident Type</label>
              <select id="incident-kind" value={incidentKind} onChange={(e) => setIncidentKind(e.target.value)}>
                <option value="medical">Medical Emergency</option>
                <option value="fire">Fire / Hazard</option>
                <option value="suspicious_package">Suspicious Package</option>
                <option value="crowd_surge">Crowd Surge</option>
                <option value="transport_failure">Transport Failure</option>
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="incident-sev">Severity: {incidentSeverity.toFixed(2)}</label>
              <input id="incident-sev" type="range" min={0} max={1} step={0.05}
                value={incidentSeverity} onChange={(e) => setIncidentSeverity(Number(e.target.value))} />
            </div>
            <button className="btn danger" onClick={() => onCommand('create_incident', {
              x: 0, z: 0, kind: incidentKind, severity: incidentSeverity,
            })}>
              <AlertTriangle size={14} />
              <span>Create Incident at Centre</span>
            </button>
            <div className="effect-preview">
              {incidentKind === 'fire' && 'Fire incidents trigger automatic evacuation. All agents will seek emergency exits.'}
              {incidentKind === 'medical' && 'Medical incidents increase stress for nearby agents. Emergency access routes should be checked.'}
              {incidentKind === 'suspicious_package' && 'Suspicious packages create a danger zone. Nearby agents will avoid the area.'}
              {incidentKind === 'crowd_surge' && 'Crowd surges increase density and stress in the affected area.'}
              {incidentKind === 'transport_failure' && 'Transport failures reduce exit capacity. Expect increased congestion at remaining exits.'}
            </div>
            {store.snapshot?.incidents.map((inc) => (
              <div key={inc.id} className="control-group">
                <label>{inc.kind.replace(/_/g, ' ')} — Severity: {inc.severity.toFixed(2)}</label>
                <button className="btn" onClick={() => onCommand('resolve_incident', { id: inc.id })}>
                  Resolve Incident
                </button>
              </div>
            ))}
          </div>
        );

      case 'announcement':
        return (
          <div>
            <div className="section-title">Announcement Tool</div>
            <div className="control-group">
              <label htmlFor="ann-msg">Message</label>
              <input id="ann-msg" type="text" placeholder="e.g. Please proceed to the nearest exit calmly"
                value={announcementMsg} onChange={(e) => setAnnouncementMsg(e.target.value)} />
            </div>
            <button className="btn" onClick={() => onCommand('broadcast_announcement', {
              message: announcementMsg || 'Please proceed calmly to the nearest exit',
            })}>
              <Megaphone size={14} />
              <span>Broadcast Site-Wide</span>
            </button>
            <div className="effect-preview">
              Announcements influence agent destination choices. Agents with higher familiarity respond more quickly.
            </div>
            <div className="divider" style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
            <div className="section-title">Evacuation Control</div>
            <button className="btn danger" onClick={() => onCommand('start_evacuation')}>
              <Siren size={14} />
              <span>Start Full Evacuation</span>
            </button>
            <button className="btn" onClick={() => onCommand('stop_evacuation')}>
              <span>Stop Evacuation</span>
            </button>
            <div className="effect-preview">
              Evacuation redirects all agents to emergency exits. Stress levels will rise. Monitor exit throughput.
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div>
            <div className="section-title">Emergency Services</div>
            <div className="control-group">
              <label>Deploy Security Team</label>
              <button className="btn" onClick={() => onCommand('deploy_security', { x: 0, z: 0, count: 4 })}>
                <Shield size={14} />
                <span>Deploy 4 Security to Centre</span>
              </button>
            </div>
            <div className="control-group">
              <label>Deploy Medical Team</label>
              <button className="btn" onClick={() => onCommand('deploy_medical', { x: 0, z: 0, count: 2 })}>
                <HeartPulse size={14} />
                <span>Deploy 2 Medical to Centre</span>
              </button>
            </div>
            <div className="effect-preview">
              Emergency teams reduce stress for nearby agents and improve incident response times.
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div>
            <div className="section-title">Visualisation Mode</div>
            <div className="control-group">
              <label>Overlay</label>
              <select value={store.overlayMode} onChange={(e) => store.setOverlayMode(e.target.value as any)}>
                <option value="normal">Normal View</option>
                <option value="density">Density Heatmap</option>
                <option value="flow">Movement Flow</option>
                <option value="exit_pressure">Exit Pressure</option>
                <option value="risk">Risk View</option>
                <option value="accessibility">Accessibility View</option>
                <option value="emergency">Emergency Access View</option>
              </select>
            </div>
            <div className="control-group">
              <label>Agent Colour</label>
              <select value={store.agentColourMode} onChange={(e) => store.setAgentColourMode(e.target.value as any)}>
                <option value="destination">By Destination</option>
                <option value="group">By Group</option>
                <option value="stress">By Stress Level</option>
                <option value="evacuation">By Evacuation Status</option>
                <option value="mobility">By Mobility</option>
                <option value="route">By Route Assignment</option>
              </select>
            </div>
            <div className="effect-preview">
              Overlays update in real time based on simulation state. Switch modes to analyse different aspects of crowd behaviour.
            </div>
          </div>
        );

      case 'bookmark':
        return (
          <div>
            <div className="section-title">Camera Bookmarks</div>
            <button className="btn" onClick={() => {
              const name = prompt('Bookmark name:');
              if (name) {
                // Save via engine ref through store
                const event = new CustomEvent('crowdflux:save-bookmark', { detail: name });
                window.dispatchEvent(event);
              }
            }}>
              Save Current Position
            </button>
            <div className="control-group">
              <label>Saved Bookmarks</label>
              <div id="bookmark-list" />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <div className="section-title">{tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              This tool is not yet fully implemented. Select another tool or use the simulation settings below.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="param-console" role="complementary" aria-label="Parameter console">
      <div className="section-title">View Controls</div>

      <div className="control-group">
        <label><Camera size={11} style={{ display: 'inline', marginRight: 4 }} />Camera Mode</label>
        <div className="btn-group">
          {(['cinematic', 'tactical', 'free', 'ground'] as const).map((m) => (
            <button
              key={m}
              className={`btn-toggle ${store.cameraMode === m ? 'active' : ''}`}
              onClick={() => store.setCameraMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="effect-preview">
          {store.cameraMode === 'cinematic' && 'Auto-orbit view. No interaction.'}
          {store.cameraMode === 'tactical' && 'Top-down. WASD to pan, scroll to zoom.'}
          {store.cameraMode === 'free' && 'Free orbit. Drag to rotate, scroll to zoom, WASD to pan.'}
          {store.cameraMode === 'ground' && 'Ground level. WASD to move.'}
        </div>
      </div>

      <div className="control-group">
        <label><Map size={11} style={{ display: 'inline', marginRight: 4 }} />Overlay</label>
        <div className="btn-group">
          {(['normal', 'density', 'flow', 'risk', 'exit_pressure', 'accessibility', 'emergency'] as const).map((m) => (
            <button
              key={m}
              className={`btn-toggle ${store.overlayMode === m ? 'active' : ''}`}
              onClick={() => store.setOverlayMode(m)}
            >
              {m === 'normal' ? 'None' : m === 'exit_pressure' ? 'Exit' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label><Palette size={11} style={{ display: 'inline', marginRight: 4 }} />Agent Colour</label>
        <select value={store.agentColourMode} onChange={(e) => store.setAgentColourMode(e.target.value as any)}>
          <option value="destination">By Destination</option>
          <option value="group">By Group</option>
          <option value="stress">By Stress Level</option>
          <option value="evacuation">Evacuation Status</option>
          <option value="mobility">By Mobility</option>
          <option value="route">By Route</option>
        </select>
      </div>

      <div className="divider" style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      <div className="section-title">Simulation</div>

      <div className="control-group">
        <label htmlFor="weather">Weather Intensity: {weatherIntensity.toFixed(2)}</label>
        <input id="weather" type="range" min={0} max={1} step={0.05}
          value={weatherIntensity} onChange={(e) => {
            setWeatherIntensity(Number(e.target.value));
            onCommand('set_weather', { intensity: Number(e.target.value) });
          }} />
        <div className="effect-preview">
          {weatherIntensity < 0.3 ? 'Clear conditions.' : weatherIntensity < 0.6 ? 'Light rain — agent speed reduced.' : 'Heavy rain — significant speed reduction and shelter-seeking behaviour.'}
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="transport-cap">Transport Capacity: {transportCapacity}</label>
        <input id="transport-cap" type="number" min={0} max={500} value={transportCapacity}
          onChange={(e) => setTransportCapacity(Number(e.target.value))} />
        <button className="btn" onClick={() => onCommand('set_transport_capacity', {
          id: 'transport_0', capacity: transportCapacity,
        })}>
          <Zap size={14} />
          <span>Apply Transport Capacity</span>
        </button>
      </div>

      {renderTool()}

      <div className="divider" style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      <div className="section-title">Quality & Accessibility</div>
      <div className="control-group">
        <label htmlFor="quality">Quality Profile</label>
        <select id="quality" value={store.qualityProfile} onChange={(e) => store.setQualityProfile(e.target.value as any)}>
          <option value="low">Low (5,000 agents)</option>
          <option value="medium">Medium (15,000 agents)</option>
          <option value="high">High (30,000 agents)</option>
          <option value="ultra">Ultra (50,000 agents)</option>
        </select>
      </div>
      <div className="control-group">
        <label>Accessibility</label>
        <button className="btn" onClick={() => store.toggleReducedMotion()}>
          Reduced Motion: {store.reducedMotion ? 'On' : 'Off'}
        </button>
        <button className="btn" onClick={() => store.toggleHighContrast()}>
          High Contrast: {store.highContrast ? 'On' : 'Off'}
        </button>
        <button className="btn" onClick={() => store.toggleColourBlindMode()}>
          Colour-Blind Palette: {store.colourBlindMode ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}
