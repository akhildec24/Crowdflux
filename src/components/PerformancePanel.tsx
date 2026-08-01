import React from 'react';
import { useStore } from '../store/useStore';

export function PerformancePanel() {
  const store = useStore();
  const m = store.metrics;
  const snap = store.snapshot;

  if (!m || !snap) return null;

  const fpsClass = store.renderFps >= 50 ? 'good' : store.renderFps >= 30 ? 'warn' : 'bad';
  const tpsClass = m.ticks_per_second >= 15 ? 'good' : m.ticks_per_second >= 10 ? 'warn' : 'bad';
  const latencyClass = store.latency < 100 ? 'good' : store.latency < 300 ? 'warn' : 'bad';

  return (
    <div className="performance-panel" role="region" aria-label="Performance metrics">
      <div className="panel-title">
        <span>Performance</span>
        <span style={{ color: 'var(--accent-green)' }}>●</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Total Agents</span>
        <span className="metric-value">{snap.agent_count.toLocaleString()}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Visible Agents</span>
        <span className="metric-value">{store.visibleAgents.toLocaleString()}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Server TPS</span>
        <span className={`metric-value ${tpsClass}`}>{m.ticks_per_second.toFixed(1)}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Server Calc Time</span>
        <span className="metric-value">{(m.server_calc_time_us / 1000).toFixed(2)}ms</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Render FPS</span>
        <span className={`metric-value ${fpsClass}`}>{store.renderFps}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Network Latency</span>
        <span className={`metric-value ${latencyClass}`}>{store.latency.toFixed(0)}ms</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Snapshot Size</span>
        <span className="metric-value">{(m.snapshot_size_bytes / 1024).toFixed(1)}KB</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Active Routes</span>
        <span className="metric-value">{m.active_routes}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Queue Count</span>
        <span className="metric-value">{m.queue_count}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Path Recalcs/s</span>
        <span className="metric-value">{m.path_recalcs_per_sec}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Agents Entered</span>
        <span className="metric-value">{snap.stats.agents_entered.toLocaleString()}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Agents Exited</span>
        <span className="metric-value">{snap.stats.agents_exited.toLocaleString()}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Max Density</span>
        <span className="metric-value">{snap.stats.max_density.toFixed(1)}</span>
      </div>
    </div>
  );
}
