import React from 'react';
import {
  MousePointer2, Fence, DoorOpen, Star, Cross,
  AlertTriangle, Megaphone, Ruler, Layers, Bookmark,
} from 'lucide-react';
import { useStore } from '../store/useStore';

const tools = [
  { id: 'select', label: 'Selection', Icon: MousePointer2, shortcut: 'Esc' },
  { id: 'barrier', label: 'Barrier Tool', Icon: Fence, shortcut: 'B' },
  { id: 'entrance_exit', label: 'Entrances & Exits', Icon: DoorOpen, shortcut: 'X' },
  { id: 'attraction', label: 'Attractions', Icon: Star, shortcut: '' },
  { id: 'emergency', label: 'Emergency Services', Icon: Cross, shortcut: '' },
  { id: 'incident', label: 'Incident Tool', Icon: AlertTriangle, shortcut: 'I' },
  { id: 'announcement', label: 'Announcement', Icon: Megaphone, shortcut: 'A' },
  { id: 'measurement', label: 'Measurement', Icon: Ruler, shortcut: '' },
  { id: 'heatmap', label: 'Heatmaps', Icon: Layers, shortcut: '' },
  { id: 'bookmark', label: 'Camera Bookmarks', Icon: Bookmark, shortcut: '' },
];

export function ToolRail() {
  const store = useStore();

  return (
    <div className="tool-rail" role="toolbar" aria-label="Operational tools">
      {tools.map((tool, i) => (
        <React.Fragment key={tool.id}>
          {i === 5 || i === 8 ? <div className="divider" /> : null}
          <button
            className={`tool-btn ${store.selectedTool === tool.id ? 'active' : ''}`}
            onClick={() => store.setSelectedTool(store.selectedTool === tool.id ? null : tool.id)}
            aria-label={tool.label}
            aria-pressed={store.selectedTool === tool.id}
          >
            <tool.Icon size={16} />
            <span className="tooltip">
              {tool.label}
              {tool.shortcut && ` (${tool.shortcut})`}
            </span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
