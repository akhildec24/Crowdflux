import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

const shortcuts = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: '1', desc: 'Normal view' },
  { key: '2', desc: 'Density heatmap' },
  { key: '3', desc: 'Movement flow' },
  { key: '4', desc: 'Risk view' },
  { key: '5', desc: 'Emergency access view' },
  { key: 'T', desc: 'Tactical camera' },
  { key: 'F', desc: 'Free camera' },
  { key: 'G', desc: 'Ground camera' },
  { key: 'C', desc: 'Cinematic camera' },
  { key: 'E', desc: 'Focus nearest incident' },
  { key: 'B', desc: 'Barrier tool' },
  { key: 'X', desc: 'Exit tool' },
  { key: 'I', desc: 'Incident tool' },
  { key: 'A', desc: 'Announcement tool' },
  { key: 'R', desc: 'Reset camera' },
  { key: 'M', desc: 'Mute / Unmute' },
  { key: 'H', desc: 'Toggle interface' },
  { key: 'P', desc: 'Performance panel' },
  { key: 'Esc', desc: 'Cancel active tool' },
  { key: 'Shift+S', desc: 'Capture screenshot' },
  { key: '?', desc: 'Keyboard reference' },
];

export function KeyboardRef() {
  const store = useStore();

  return (
    <div className="keyboard-ref" role="dialog" aria-label="Keyboard reference">
      <button className="close-btn" onClick={() => store.toggleKeyboardRef()} aria-label="Close">
        <X size={16} />
      </button>
      <h2>Keyboard Shortcuts</h2>
      <div className="shortcut-grid">
        {shortcuts.map((s) => (
          <div key={s.key} className="shortcut-row">
            <span className="desc">{s.desc}</span>
            <span className="key">{s.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
