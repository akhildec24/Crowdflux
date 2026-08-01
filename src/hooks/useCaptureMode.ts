import { useEffect, MutableRefObject } from 'react';
import { useStore } from '../store/useStore';
import type { CrowdFluxEngine } from '../engine/CrowdFluxEngine';

export function useCaptureMode(
  engineRef: MutableRefObject<CrowdFluxEngine | null>,
  _store: ReturnType<typeof useStore>,
) {
  const store = useStore();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('capture') !== 'true') return;

    const time = params.get('time');
    const cameraBookmark = params.get('bookmark');

    // If a bookmark is specified, load it
    if (cameraBookmark && engineRef.current) {
      engineRef.current.loadBookmark(cameraBookmark);
    }

    // If a specific time is requested, we need to wait for the simulation to reach it
    if (time) {
      // Parse time like "18:30"
      const [h, m] = time.split(':').map(Number);
      const targetSeconds = (h || 0) * 3600 + (m || 0) * 60;

      const checkInterval = setInterval(() => {
        if (store.simTime >= targetSeconds && engineRef.current?.isCaptureReady()) {
          clearInterval(checkInterval);
          (window as any).__CROWDFLUX_CAPTURE_READY__ = true;
        }
      }, 100);

      return () => clearInterval(checkInterval);
    } else {
      // No specific time — just wait for readiness
      const checkInterval = setInterval(() => {
        if (engineRef.current?.isCaptureReady()) {
          clearInterval(checkInterval);
          (window as any).__CROWDFLUX_CAPTURE_READY__ = true;
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, [engineRef, store.simTime, store.snapshot]);
}
