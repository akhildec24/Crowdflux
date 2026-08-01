import React from 'react';
import { useStore } from '../store/useStore';

const legends: Record<string, { title: string; rows: { colour: string; label: string }[] }> = {
  density: {
    title: 'Density Heatmap',
    rows: [
      { colour: '#1a1a1a', label: 'Low (< 1/m²)' },
      { colour: '#4a4a2a', label: 'Medium (1-3/m²)' },
      { colour: '#8a6a2a', label: 'High (3-5/m²)' },
      { colour: '#e63946', label: 'Critical (> 5/m²)' },
    ],
  },
  flow: {
    title: 'Movement Flow',
    rows: [
      { colour: '#2a3a4a', label: 'Low flow' },
      { colour: '#4a7a9a', label: 'Medium flow' },
      { colour: '#8ab4ca', label: 'High flow' },
    ],
  },
  exit_pressure: {
    title: 'Exit Pressure',
    rows: [
      { colour: '#1a1a1a', label: 'Low demand' },
      { colour: '#e5c100', label: 'Moderate demand' },
      { colour: '#8a6a2a', label: 'High demand' },
      { colour: '#e63946', label: 'Critical bottleneck' },
    ],
  },
  risk: {
    title: 'Risk View',
    rows: [
      { colour: '#2a4a5a', label: 'Low risk' },
      { colour: '#e5c100', label: 'Moderate risk' },
      { colour: '#8a6a2a', label: 'High risk' },
      { colour: '#e63946', label: 'Critical risk' },
    ],
  },
  accessibility: {
    title: 'Accessibility View',
    rows: [
      { colour: '#3a8a5a', label: 'Accessible route' },
      { colour: '#e5c100', label: 'Partial access' },
      { colour: '#e63946', label: 'No access' },
    ],
  },
  emergency: {
    title: 'Emergency Access',
    rows: [
      { colour: '#3a8a5a', label: 'Emergency team can reach' },
      { colour: '#e5c100', label: 'Limited access' },
      { colour: '#e63946', label: 'Blocked — cannot reach' },
    ],
  },
};

export function OverlayLegend() {
  const store = useStore();
  const legend = legends[store.overlayMode];
  if (!legend) return null;

  return (
    <div className="overlay-legend" role="region" aria-label={`${legend.title} legend`}>
      <div className="legend-title">{legend.title}</div>
      {legend.rows.map((row, i) => (
        <div key={i} className="legend-row">
          <div className="legend-swatch" style={{ background: row.colour }} />
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}
