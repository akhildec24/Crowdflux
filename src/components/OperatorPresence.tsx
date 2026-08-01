import React from 'react';
import { useStore } from '../store/useStore';

const roleColours: Record<string, string> = {
  event_controller: '#f0f0f0',
  security_coordinator: '#e63946',
  transport_coordinator: '#6b7a4a',
  medical_coordinator: '#e5c100',
  observer: '#4a7a9a',
};

const roleLabels: Record<string, string> = {
  event_controller: 'Event',
  security_coordinator: 'Security',
  transport_coordinator: 'Transport',
  medical_coordinator: 'Medical',
  observer: 'Observer',
};

export function OperatorPresence() {
  const store = useStore();

  return (
    <div className="operator-presence" role="region" aria-label="Connected operators">
      <div className="operator-badge">
        <span className="dot" style={{ background: roleColours[store.role] }} />
        <span>{store.operatorName} · {roleLabels[store.role]}</span>
      </div>
      {store.operatorsOnline > 1 && (
        <div className="operator-badge">
          <span className="dot" />
          <span>+{store.operatorsOnline - 1} operator{store.operatorsOnline > 2 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
