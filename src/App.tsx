import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore';
import { SimulationClient } from './net/SimulationClient';
import type { Snapshot, ServerMetrics, ActionLogEntry, ScenarioReport } from './net/types';
import { CrowdFluxEngine } from './engine/CrowdFluxEngine';
import { TopNav } from './components/TopNav';
import { ToolRail } from './components/ToolRail';
import { ParamConsole } from './components/ParamConsole';
import { TimelineBar } from './components/TimelineBar';
import { PerformancePanel } from './components/PerformancePanel';
import { OverlayLegend } from './components/OverlayLegend';
import { IncidentAlerts } from './components/IncidentAlerts';
import { KeyboardRef } from './components/KeyboardRef';
import { LandingOverlay } from './components/LandingOverlay';
import { BuildMode } from './components/BuildMode';
import { MapSimulation } from './components/MapSimulation';
import { OperatorPresence } from './components/OperatorPresence';
import { ReportModal } from './components/ReportModal';
import { useBuildStore } from './store/useBuildStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCaptureMode } from './hooks/useCaptureMode';
import { AudioEngine } from './audio/AudioEngine';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CrowdFluxEngine | null>(null);
  const clientRef = useRef<SimulationClient | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showBuild, setShowBuild] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const [simPaused, setSimPaused] = useState(false);
  const buildStore = useBuildStore();

  const store = useStore();

  // Initialise engine
  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;
    const engine = new CrowdFluxEngine(containerRef.current);
    engine.setOnFpsUpdate((fps) => store.setRenderFps(fps));
    engine.start();
    engineRef.current = engine;

    // Check for capture mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('capture') === 'true') {
      setShowLanding(false);
      handleCaptureConnect(params);
    }

    // Fetch scenarios
    fetch('/api/scenarios')
      .then((r) => r.json())
      .then((data) => {
        if (data.scenarios) {
          store.setScenarios(data.scenarios);
        }
      })
      .catch(() => {
        // Fallback scenarios if server not running
        store.setScenarios([
          { name: 'Festival Arrival', description: 'Visitors arrive gradually as gates open.', target_population: 8000 },
          { name: 'Headline Crowd Surge', description: 'Crowd density peaks as headline performance approaches.', target_population: 12000 },
          { name: 'Severe Weather', description: 'Heavy rain and transport disruption.', target_population: 10000 },
          { name: 'Full Evacuation', description: 'A major incident triggers full-site evacuation.', target_population: 10000 },
        ]);
      });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync engine with store
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setCameraMode(store.cameraMode);
  }, [store.cameraMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setOverlayMode(store.overlayMode);
  }, [store.overlayMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setAgentColourMode(store.agentColourMode);
  }, [store.agentColourMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setQualityProfile(store.qualityProfile);
  }, [store.qualityProfile]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setReducedMotion(store.reducedMotion);
  }, [store.reducedMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', store.highContrast);
  }, [store.highContrast]);

  useEffect(() => {
    document.body.classList.toggle('reduced-motion', store.reducedMotion);
  }, [store.reducedMotion]);

  // Keyboard shortcuts
  useKeyboardShortcuts(engineRef, clientRef);

  // Capture mode
  useCaptureMode(engineRef, store);

  const handleConnect = (scenario: string, role: any, name: string, seed: number) => {
    const wsUrl = `ws://${window.location.hostname}:3001/ws?scenario=${encodeURIComponent(scenario)}&role=${role}&name=${encodeURIComponent(name)}&seed=${seed}`;
    const client = new SimulationClient(wsUrl);

    client.connect().then(() => {
      store.setConnected(true);
      store.setRole(role);
      store.setOperatorName(name);
      store.setSelectedScenario(scenario);
      setShowLanding(false);

      client.on((msg) => {
        switch (msg.type) {
          case 'snapshot':
            store.setSnapshot(msg as Snapshot);
            engineRef.current?.updateSnapshot(msg as Snapshot);
            store.setVisibleAgents(engineRef.current?.getVisibleAgents() ?? 0);
            break;
          case 'metrics':
            store.setMetrics(msg as ServerMetrics);
            break;
          case 'joined':
            store.setSessionId(msg.session_id);
            store.setOperatorsOnline(msg.operators);
            break;
          case 'operator_joined':
            store.setOperatorsOnline(store.operatorsOnline + 1);
            break;
          case 'operator_left':
            store.setOperatorsOnline(Math.max(0, store.operatorsOnline - 1));
            break;
          case 'action_log':
            store.addActionLog(msg as ActionLogEntry);
            break;
          case 'report':
            store.setReport(msg as ScenarioReport);
            break;
        }
      });

      client.onLatency((latency) => {
        store.setLatency(latency);
      });
    }).catch(() => {
      // Fallback: run in offline mode with local simulation
      console.warn('Could not connect to server, running in offline mode');
      store.setConnected(false);
      setShowLanding(false);
      startOfflineSimulation();
    });

    clientRef.current = client;
  };

  const handleConnectWithWorld = () => {
    const world = buildStore.getWorldDefinition();
    const role = 'event_controller';
    const name = 'Operator';
    const wsUrl = `ws://${window.location.hostname}:3001/ws?scenario=Custom&role=${role}&name=${encodeURIComponent(name)}&seed=${world.seed}`;

    const client = new SimulationClient(wsUrl);

    client.connect().then(() => {
      store.setConnected(true);
      store.setRole(role);
      store.setOperatorName(name);
      store.setSelectedScenario('Custom');

      // Send world definition to server
      client.send({ type: 'set_world', world });

      client.on((msg) => {
        switch (msg.type) {
          case 'snapshot':
            store.setSnapshot(msg as Snapshot);
            engineRef.current?.updateSnapshot(msg as Snapshot);
            store.setVisibleAgents(engineRef.current?.getVisibleAgents() ?? 0);
            break;
          case 'metrics':
            store.setMetrics(msg as ServerMetrics);
            break;
          case 'joined':
            store.setSessionId(msg.session_id);
            store.setOperatorsOnline(msg.operators);
            break;
          case 'operator_joined':
            store.setOperatorsOnline(store.operatorsOnline + 1);
            break;
          case 'operator_left':
            store.setOperatorsOnline(Math.max(0, store.operatorsOnline - 1));
            break;
          case 'action_log':
            store.addActionLog(msg as ActionLogEntry);
            break;
          case 'report':
            store.setReport(msg as ScenarioReport);
            break;
        }
      });

      client.onLatency((latency) => {
        store.setLatency(latency);
      });
    }).catch(() => {
      console.warn('Could not connect to server, running in offline mode');
      store.setConnected(false);
      startOfflineSimulation();
    });

    clientRef.current = client;
  };

  const startOfflineSimulation = () => {
    // Generate a simple local snapshot for visual demo when server is unavailable
    let tick = 0;
    let agents: any[] = [];
    const seed = 42;

    // Generate initial agents
    for (let i = 0; i < 3000; i++) {
      agents.push({
        id: i,
        x: (Math.random() - 0.5) * 160,
        z: (Math.random() - 0.5) * 160,
        vx: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        dest: Math.floor(Math.random() * 6),
        stress: Math.random() * 0.3,
        state: 1,
        group: Math.floor(Math.random() * 8),
        speed: 1.0 + Math.random() * 0.6,
      });
    }

    setInterval(() => {
      tick++;
      // Simple movement
      for (const a of agents) {
        a.x += a.vx * 0.05;
        a.z += a.vz * 0.05;
        if (Math.abs(a.x) > 90) a.vx *= -1;
        if (Math.abs(a.z) > 90) a.vz *= -1;
        if (Math.random() < 0.01) {
          a.vx = (Math.random() - 0.5) * 1.5;
          a.vz = (Math.random() - 0.5) * 1.5;
        }
      }

      const snapshot: any = {
        tick,
        sim_time: tick * 0.05,
        agent_count: agents.length,
        agents,
        incidents: [],
        entrances: [],
        exits: [],
        barriers: [],
        density_grid: new Array(40 * 40).fill(0),
        grid_width: 40,
        grid_height: 40,
        evacuation: false,
        weather: 0,
        stats: {
          max_density: 0,
          avg_queue_time: 0,
          active_routes: 0,
          queue_count: 0,
          path_recalcs: 0,
          agents_entered: agents.length,
          agents_exited: 0,
        },
      };

      store.setSnapshot(snapshot);
      engineRef.current?.updateSnapshot(snapshot);
      store.setVisibleAgents(engineRef.current?.getVisibleAgents() ?? 0);
      store.setMetrics({
        ticks_per_second: 20,
        server_calc_time_us: 100,
        snapshot_size_bytes: 0,
        memory_usage_mb: 0,
        active_routes: 50,
        queue_count: 0,
        path_recalcs_per_sec: 0,
      });
    }, 100);
  };

  const handleCaptureConnect = (params: URLSearchParams) => {
    const scenario = params.get('scenario') || 'festival_arrival';
    const camera = params.get('camera') || 'tactical';
    const overlay = params.get('overlay') || 'density';
    const hud = params.get('hud') !== 'false';

    store.setCameraMode(camera as any);
    store.setOverlayMode(overlay as any);
    if (!hud) store.toggleHud();

    // Connect to server
    handleConnect(
      scenario.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      'observer',
      'Capture',
      42,
    );
  };

  // Send commands to server
  const sendCommand = (action: string, data: any = {}) => {
    clientRef.current?.send({ type: 'command', action, ...data } as any);
  };

  // Initialise audio engine
  useEffect(() => {
    audioRef.current = new AudioEngine();
    return () => audioRef.current?.dispose();
  }, []);

  // Update audio based on simulation state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !store.audioEnabled) return;
    audio.init();
    audio.setMasterVolume(store.masterVolume);
    audio.setLayerVolume('music', store.musicVolume * 0.1);
    audio.setLayerVolume('ambience', store.environmentVolume * 0.15);
  }, [store.audioEnabled, store.masterVolume, store.musicVolume, store.environmentVolume]);

  useEffect(() => {
    if (store.snapshot) {
      audioRef.current?.setWeather(store.snapshot.weather);
      audioRef.current?.setEvacuation(store.snapshot.evacuation);
    }
  }, [store.snapshot?.weather, store.snapshot?.evacuation]);

  // Expose global API for capture mode
  useEffect(() => {
    (window as any).__CROWDFLUX_CAPTURE_READY__ = false;
    (window as any).__CROWDFLUX_SEND_COMMAND = sendCommand;
    (window as any).__CROWDFLUX_TAKE_SCREENSHOT = () => engineRef.current?.takeScreenshot();
  }, []);

  // Update capture readiness
  useEffect(() => {
    if (!showLanding && store.snapshot && engineRef.current?.isCaptureReady()) {
      (window as any).__CROWDFLUX_CAPTURE_READY__ = true;
    }
  }, [showLanding, store.snapshot, store.renderFps]);

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />

      {showLanding && <LandingOverlay onConnect={() => {
        setShowLanding(false);
        setShowBuild(true);
        buildStore.loadPreset('festival');
      }} />}

      {showBuild && <BuildMode onRun={() => {
        setShowBuild(false);
        setShowSim(true);
        handleConnectWithWorld();
     }} />}

      {showSim && <MapSimulation
        snapshot={store.snapshot}
        metrics={store.metrics}
        paused={simPaused}
        onTogglePause={() => {
          setSimPaused(!simPaused);
          clientRef.current?.send({ type: simPaused ? 'resume' : 'pause' });
        }}
        onExit={() => {
          setShowSim(false);
          setShowBuild(true);
          clientRef.current?.disconnect();
          store.setConnected(false);
        }}
      />}

      {store.hudVisible && !showLanding && !showBuild && !showSim && (
        <>
          <TopNav />
          <ToolRail />
          <ParamConsole onCommand={sendCommand} />
          <TimelineBar onCommand={sendCommand} />
          <OperatorPresence />
          <IncidentAlerts />
          {store.performancePanelVisible && <PerformancePanel />}
          {store.overlayMode !== 'normal' && <OverlayLegend />}
          <div className="controls-hint">
            <span><strong>WASD</strong> Pan</span>
            <span><strong>Drag</strong> Rotate</span>
            <span><strong>Scroll</strong> Zoom</span>
          </div>
        </>
      )}

      {store.keyboardRefVisible && <KeyboardRef />}
      {store.report && <ReportModal />}
    </>
  );
}
