import { useEffect, MutableRefObject } from 'react';
import { useStore } from '../store/useStore';
import type { CrowdFluxEngine } from '../engine/CrowdFluxEngine';
import type { SimulationClient } from '../net/SimulationClient';

export function useKeyboardShortcuts(
  engineRef: MutableRefObject<CrowdFluxEngine | null>,
  clientRef: MutableRefObject<SimulationClient | null>,
) {
  const store = useStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key;

      // Space — play/pause
      if (key === ' ') {
        e.preventDefault();
        if (store.paused) {
          store.setPaused(false);
          clientRef.current?.send({ type: 'resume' });
        } else {
          store.setPaused(true);
          clientRef.current?.send({ type: 'pause' });
        }
        return;
      }

      // Number keys — overlay modes
      if (key === '1') { store.setOverlayMode('normal'); return; }
      if (key === '2') { store.setOverlayMode('density'); return; }
      if (key === '3') { store.setOverlayMode('flow'); return; }
      if (key === '4') { store.setOverlayMode('risk'); return; }
      if (key === '5') { store.setOverlayMode('emergency'); return; }

      // Camera modes
      if (key === 't' || key === 'T') { store.setCameraMode('tactical'); return; }
      if (key === 'f' || key === 'F') { store.setCameraMode('free'); return; }
      if (key === 'g' || key === 'G') { store.setCameraMode('ground'); return; }
      if (key === 'c' || key === 'C') { store.setCameraMode('cinematic'); return; }

      // Focus nearest incident
      if (key === 'e' || key === 'E') {
        const incidents = store.snapshot?.incidents.filter((i: any) => i.active);
        if (incidents && incidents.length > 0) {
          const inc = incidents[0];
          engineRef.current?.focusOnIncident(inc.x, inc.z);
        }
        return;
      }

      // Tools
      if (key === 'b' || key === 'B') { store.setSelectedTool('barrier'); return; }
      if (key === 'x' || key === 'X') { store.setSelectedTool('entrance_exit'); return; }
      if (key === 'i' || key === 'I') { store.setSelectedTool('incident'); return; }
      if (key === 'a' || key === 'A') { store.setSelectedTool('announcement'); return; }

      // Reset camera
      if (key === 'r' || key === 'R') {
        engineRef.current?.resetCamera();
        return;
      }

      // Mute
      if (key === 'm' || key === 'M') {
        store.toggleAudio();
        return;
      }

      // Toggle HUD
      if (key === 'h' || key === 'H') {
        store.toggleHud();
        return;
      }

      // Performance panel
      if (key === 'p' || key === 'P') {
        store.togglePerformancePanel();
        return;
      }

      // Escape — cancel tool
      if (key === 'Escape') {
        store.setSelectedTool(null);
        if (store.keyboardRefVisible) store.toggleKeyboardRef();
        return;
      }

      // Shift+S — screenshot
      if (e.shiftKey && (key === 'S' || key === 's')) {
        e.preventDefault();
        const dataUrl = engineRef.current?.takeScreenshot();
        if (dataUrl) {
          const link = document.createElement('a');
          link.download = `crowdflux_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
        return;
      }

      // ? — keyboard reference
      if (key === '?') {
        store.toggleKeyboardRef();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, engineRef, clientRef]);
}
