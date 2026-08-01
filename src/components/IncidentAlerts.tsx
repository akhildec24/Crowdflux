import React from 'react';
import { useStore } from '../store/useStore';

export function IncidentAlerts() {
  const store = useStore();
  if (!store.snapshot?.incidents.length) return null;

  return (
    <div className="incident-alerts" role="alert" aria-live="assertive">
      {store.snapshot.incidents.filter((i: any) => i.active).map((inc: any) => (
        <div key={inc.id} className="incident-alert">
          <div className="alert-title">
            {inc.kind.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </div>
          <div className="alert-desc">
            Severity: {inc.severity.toFixed(2)} · Location: ({inc.x.toFixed(0)}, {inc.z.toFixed(0)})
          </div>
        </div>
      ))}
    </div>
  );
}
