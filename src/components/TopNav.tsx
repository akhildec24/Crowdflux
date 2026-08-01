import React from 'react';
import { Gauge, HelpCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const roleLabels: Record<string, string> = {
  event_controller: 'Event Controller',
  security_coordinator: 'Security Coordinator',
  transport_coordinator: 'Transport Coordinator',
  medical_coordinator: 'Medical Coordinator',
  observer: 'Observer',
};

export function TopNav() {
  const store = useStore();
  const status = store.connected ? 'connected' : 'disconnected';
  const statusLabel = store.connected ? 'Connected' : 'Offline';

  return (
    <nav className="top-nav" role="banner" aria-label="Top navigation">
      <div className="logo">CrowdFlux</div>

      <div className="nav-item">
        <span className="label">Scenario</span>
        <span className="value">{store.selectedScenario}</span>
      </div>

      <div className="nav-item">
        <span className={`status-dot ${status}`} aria-label={`Connection ${statusLabel}`} />
        <span className="value">{statusLabel}</span>
      </div>

      <div className="nav-item">
        <span className="label">Role</span>
        <span className="value">{roleLabels[store.role] ?? store.role}</span>
      </div>

      <div className="nav-item">
        <span className="label">Operators</span>
        <span className="value">{store.operatorsOnline}</span>
      </div>

      <div className="nav-item">
        <span className="label">Sim</span>
        <span className="value">{formatTime(store.simTime)}</span>
      </div>

      {store.snapshot?.evacuation && (
        <div className="nav-item" style={{ color: 'var(--accent-red)' }}>
          <AlertTriangle size={12} />
          <span>EVACUATION</span>
        </div>
      )}

      <div className="spacer" />

      <button
        className={`nav-btn ${store.performancePanelVisible ? 'active' : ''}`}
        onClick={() => store.togglePerformancePanel()}
        aria-pressed={store.performancePanelVisible}
      >
        <Gauge size={14} />
        <span>Performance</span>
      </button>
      <button
        className={`nav-btn ${store.keyboardRefVisible ? 'active' : ''}`}
        onClick={() => store.toggleKeyboardRef()}
        aria-pressed={store.keyboardRefVisible}
      >
        <HelpCircle size={14} />
        <span>Help</span>
      </button>
    </nav>
  );
}
