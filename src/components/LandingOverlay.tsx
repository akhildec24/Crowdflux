import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { OperatorRole } from '../net/types';

interface Props {
  onConnect: (scenario: string, role: OperatorRole, name: string, seed: number) => void;
}

const roles: { id: OperatorRole; name: string; desc: string }[] = [
  { id: 'event_controller', name: 'Event Controller', desc: 'Full control: scenarios, speed, site-wide instructions' },
  { id: 'security_coordinator', name: 'Security Coordinator', desc: 'Deploy staff, close areas, redirect movement' },
  { id: 'transport_coordinator', name: 'Transport Coordinator', desc: 'Manage bus, rail, parking and drop-off capacity' },
  { id: 'medical_coordinator', name: 'Medical Coordinator', desc: 'Position medical teams, respond to casualties' },
  { id: 'observer', name: 'Observer', desc: 'View simulation without operational changes' },
];

export function LandingOverlay({ onConnect }: Props) {
  const store = useStore();
  const [name, setName] = useState('Operator');
  const [role, setRole] = useState<OperatorRole>('event_controller');
  const [scenario, setScenario] = useState('Festival Arrival');
  const [seed, setSeed] = useState(42);

  return (
    <div className="landing-overlay">
      <div className="landing-card">
        <h1>Crowd<span className="accent">Flux</span></h1>
        <div className="subtitle">Real-Time Multiplayer Crowd and Emergency Simulation</div>

        <div className="form-group">
          <label htmlFor="name">Operator Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="scenario">Scenario</label>
          <select id="scenario" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {store.scenarios.length > 0 ? (
              store.scenarios.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))
            ) : (
              <>
                <option value="Festival Arrival">Festival Arrival</option>
                <option value="Headline Crowd Surge">Headline Crowd Surge</option>
                <option value="Severe Weather">Severe Weather</option>
                <option value="Full Evacuation">Full Evacuation</option>
              </>
            )}
          </select>
        </div>

        <div className="form-group">
          <label>Operator Role</label>
          <div className="role-grid">
            {roles.map((r) => (
              <button
                key={r.id}
                className={`role-option ${role === r.id ? 'selected' : ''}`}
                onClick={() => setRole(r.id)}
                aria-pressed={role === r.id}
              >
                <div className="role-name">{r.name}</div>
                <div className="role-desc">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="seed">Random Seed (for deterministic replay)</label>
          <input id="seed" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
        </div>

        <button className="connect-btn" onClick={() => onConnect(scenario, role, name, seed)}>
          <span>Connect to Simulation</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
