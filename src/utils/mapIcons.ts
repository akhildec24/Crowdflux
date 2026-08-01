import type { PlacedObject } from '../store/useBuildStore';

// SVG path data for each object type — drawn inside a coloured badge
const ICON_SVGS: Record<string, string> = {
  entrance: '<path d="M7 3 L7 17 M7 3 L4 6 M7 3 L10 6 M7 17 L4 14 M7 17 L10 14" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  exit: '<path d="M7 3 L7 17 M7 3 L4 6 M7 3 L10 6 M7 17 L4 14 M7 17 L10 14" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="10" r="2" stroke="#fff" stroke-width="1.5" fill="none"/>',
  emergency_exit: '<path d="M7 3 L7 17 M7 3 L4 6 M7 3 L10 6 M7 17 L4 14 M7 17 L10 14" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7 L15 13 M15 7 L12 13" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
  stage: '<path d="M4 14 L4 6 L10 4 L10 12 Z M10 12 L14 10 L14 14 Z" stroke="#fff" stroke-width="1.5" fill="none" stroke-linejoin="round"/><path d="M4 14 L14 14" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
  food: '<path d="M6 3 L6 17 M6 3 L4 3 L4 8 L6 8 M10 3 L10 17 M10 3 L12 3 L12 8 L10 8" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  toilet: '<circle cx="7" cy="5" r="2" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M7 8 L5 14 L4 17 M7 8 L9 14 L10 17 M7 8 L7 17" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  medical: '<path d="M7 4 L7 16 M4 7 L10 7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><rect x="3" y="3" width="8" height="14" rx="1" stroke="#fff" stroke-width="1.5" fill="none"/>',
  transport: '<rect x="4" y="4" width="10" height="10" rx="1.5" stroke="#fff" stroke-width="1.5" fill="none"/><circle cx="6.5" cy="15" r="1.5" stroke="#fff" stroke-width="1" fill="none"/><circle cx="11.5" cy="15" r="1.5" stroke="#fff" stroke-width="1" fill="none"/><path d="M4 9 L14 9" stroke="#fff" stroke-width="1"/>',
  parking: '<path d="M6 4 L6 16 M6 4 L10 4 Q13 4 13 7 Q13 10 10 10 L6 10" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  barrier: '<path d="M3 6 L17 6 M3 10 L17 10 M3 14 L17 14" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M5 4 L7 16 M9 4 L11 16 M13 4 L15 16" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
};

const COLOURS: Record<string, string> = {
  entrance: '#3a8a5a',
  exit: '#4a7a9a',
  emergency_exit: '#e5c100',
  stage: '#e63946',
  food: '#6b7a4a',
  toilet: '#666666',
  medical: '#e63946',
  transport: '#4a7a9a',
  parking: '#555555',
  barrier: '#e5c100',
};

const SHAPES: Record<string, string> = {
  entrance: 'rounded',
  exit: 'rounded',
  emergency_exit: 'triangle',
  stage: 'square',
  food: 'rounded',
  toilet: 'square',
  medical: 'cross',
  transport: 'rounded',
  parking: 'square',
  barrier: 'diamond',
};

function shapeClipPath(shape: string): string {
  switch (shape) {
    case 'square': return 'border-radius:2px;';
    case 'rounded': return 'border-radius:50%;';
    case 'triangle': return 'clip-path:polygon(50% 0,100% 100%,0 100%);border-radius:0;';
    case 'diamond': return 'transform:rotate(45deg);border-radius:2px;';
    case 'cross': return 'border-radius:2px;';
    default: return 'border-radius:50%;';
  }
}

export function getMarkerColour(type: string): string {
  return COLOURS[type] ?? '#444444';
}

export function getMarkerIcon(type: string, size: number): string {
  const colour = COLOURS[type] ?? '#444444';
  const svgPath = ICON_SVGS[type] ?? '';
  const shape = SHAPES[type] ?? 'rounded';
  const clipStyle = shapeClipPath(shape);

  // For triangle/diamond, the icon needs offset
  let innerStyle = 'display:flex;align-items:center;justify-content:center;';
  if (shape === 'triangle') {
    innerStyle += 'padding-top:4px;';
  } else if (shape === 'diamond') {
    innerStyle += 'transform:rotate(-45deg);';
  }

  return `<div style="width:${size}px;height:${size}px;${clipStyle}background:${colour};border:2px solid rgba(0,0,0,0.6);box-shadow:0 0 8px ${colour}aa;${innerStyle}">
    <svg width="${size * 0.65}" height="${size * 0.65}" viewBox="0 0 18 18" style="${shape === 'diamond' ? 'transform:rotate(45deg);' : ''}">${svgPath}</svg>
  </div>`;
}

export function getMarkerSize(type: string): number {
  const sizeMap: Record<string, number> = {
    stage: 28,
    entrance: 22,
    exit: 22,
    emergency_exit: 22,
    medical: 22,
    transport: 20,
    food: 18,
    toilet: 18,
    parking: 18,
    barrier: 18,
  };
  return sizeMap[type] ?? 18;
}

export function getObjectPopupHtml(obj: PlacedObject, extraInfo?: Record<string, string>): string {
  const label = obj.type.replace(/_/g, ' ');
  const colour = COLOURS[obj.type] ?? '#444';
  const size = getMarkerSize(obj.type);
  const icon = getMarkerIcon(obj.type, size);

  let extraRows = '';
  if (extraInfo) {
    for (const [key, val] of Object.entries(extraInfo)) {
      extraRows += `<tr><td style="color:#888;padding:2px 8px;font-size:11px;">${key}</td><td style="color:#ddd;padding:2px 8px;font-size:11px;">${val}</td></tr>`;
    }
  }

  return `<div style="font-family:'Inter',sans-serif;min-width:180px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      ${icon}
      <div>
        <div style="font-size:13px;font-weight:600;color:#f0f0f0;text-transform:capitalize;">${label}</div>
        <div style="font-size:10px;color:#888;">ID: ${obj.id}</div>
      </div>
    </div>
    <table style="border-collapse:collapse;">
      <tr><td style="color:#888;padding:2px 8px;font-size:11px;">Capacity</td><td style="color:#ddd;padding:2px 8px;font-size:11px;">${obj.capacity}</td></tr>
      <tr><td style="color:#888;padding:2px 8px;font-size:11px;">Position</td><td style="color:#ddd;padding:2px 8px;font-size:11px;">${obj.lat.toFixed(5)}, ${obj.lng.toFixed(5)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px;font-size:11px;">World</td><td style="color:#ddd;padding:2px 8px;font-size:11px;">x=${obj.x.toFixed(1)}, z=${obj.z.toFixed(1)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px;font-size:11px;">Rotation</td><td style="color:#ddd;padding:2px 8px;font-size:11px;">${obj.rotation}°</td></tr>
      ${extraRows}
    </table>
  </div>`;
}
