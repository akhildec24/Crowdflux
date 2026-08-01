import { create } from 'zustand';
import type {
  Snapshot,
  ServerMetrics,
  ActionLogEntry,
  OperatorRole,
  CameraMode,
  OverlayMode,
  QualityProfile,
  AgentColourMode,
  ScenarioInfo,
  ScenarioReport,
} from '../net/types';

interface SimState {
  // Connection
  connected: boolean;
  sessionId: string | null;
  latency: number;

  // Operator
  role: OperatorRole;
  operatorName: string;
  operatorsOnline: number;

  // Simulation
  snapshot: Snapshot | null;
  prevSnapshot: Snapshot | null;
  metrics: ServerMetrics | null;
  paused: boolean;
  speed: number;
  simTime: number;

  // Actions log
  actionLog: ActionLogEntry[];

  // Report
  report: ScenarioReport | null;

  // UI
  cameraMode: CameraMode;
  overlayMode: OverlayMode;
  agentColourMode: AgentColourMode;
  qualityProfile: QualityProfile;
  hudVisible: boolean;
  performancePanelVisible: boolean;
  keyboardRefVisible: boolean;
  selectedTool: string | null;
  selectedObjectId: string | null;
  reducedMotion: boolean;
  highContrast: boolean;
  colourBlindMode: boolean;
  audioEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  environmentVolume: number;
  announcementVolume: number;
  alertVolume: number;

  // Scenarios
  scenarios: ScenarioInfo[];
  selectedScenario: string;

  // Rendering
  renderFps: number;
  visibleAgents: number;

  // Actions
  setConnected: (v: boolean) => void;
  setSessionId: (id: string | null) => void;
  setLatency: (v: number) => void;
  setRole: (r: OperatorRole) => void;
  setOperatorName: (n: string) => void;
  setOperatorsOnline: (n: number) => void;
  setSnapshot: (s: Snapshot) => void;
  setMetrics: (m: ServerMetrics) => void;
  setPaused: (p: boolean) => void;
  setSpeed: (s: number) => void;
  addActionLog: (entry: ActionLogEntry) => void;
  setReport: (r: ScenarioReport | null) => void;
  setCameraMode: (m: CameraMode) => void;
  setOverlayMode: (m: OverlayMode) => void;
  setAgentColourMode: (m: AgentColourMode) => void;
  setQualityProfile: (q: QualityProfile) => void;
  toggleHud: () => void;
  togglePerformancePanel: () => void;
  toggleKeyboardRef: () => void;
  setSelectedTool: (t: string | null) => void;
  setSelectedObjectId: (id: string | null) => void;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
  toggleColourBlindMode: () => void;
  toggleAudio: () => void;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setEnvironmentVolume: (v: number) => void;
  setAnnouncementVolume: (v: number) => void;
  setAlertVolume: (v: number) => void;
  setScenarios: (s: ScenarioInfo[]) => void;
  setSelectedScenario: (s: string) => void;
  setRenderFps: (v: number) => void;
  setVisibleAgents: (v: number) => void;
}

export const useStore = create<SimState>((set) => ({
  connected: false,
  sessionId: null,
  latency: 0,
  role: 'event_controller',
  operatorName: 'Operator',
  operatorsOnline: 1,
  snapshot: null,
  prevSnapshot: null,
  metrics: null,
  paused: false,
  speed: 1.0,
  simTime: 0,
  actionLog: [],
  report: null,
  cameraMode: 'tactical',
  overlayMode: 'density',
  agentColourMode: 'destination',
  qualityProfile: 'medium',
  hudVisible: true,
  performancePanelVisible: false,
  keyboardRefVisible: false,
  selectedTool: null,
  selectedObjectId: null,
  reducedMotion: false,
  highContrast: false,
  colourBlindMode: false,
  audioEnabled: false,
  masterVolume: 0.7,
  musicVolume: 0.3,
  environmentVolume: 0.5,
  announcementVolume: 0.6,
  alertVolume: 0.8,
  scenarios: [],
  selectedScenario: 'Festival Arrival',
  renderFps: 0,
  visibleAgents: 0,

  setConnected: (v) => set({ connected: v }),
  setSessionId: (id) => set({ sessionId: id }),
  setLatency: (v) => set({ latency: v }),
  setRole: (r) => set({ role: r }),
  setOperatorName: (n) => set({ operatorName: n }),
  setOperatorsOnline: (n) => set({ operatorsOnline: n }),
  setSnapshot: (s) => set((state) => ({ prevSnapshot: state.snapshot, snapshot: s, simTime: s.sim_time })),
  setMetrics: (m) => set({ metrics: m }),
  setPaused: (p) => set({ paused: p }),
  setSpeed: (s) => set({ speed: s }),
  addActionLog: (entry) => set((state) => ({ actionLog: [...state.actionLog.slice(-99), entry] })),
  setReport: (r) => set({ report: r }),
  setCameraMode: (m) => set({ cameraMode: m }),
  setOverlayMode: (m) => set({ overlayMode: m }),
  setAgentColourMode: (m) => set({ agentColourMode: m }),
  setQualityProfile: (q) => set({ qualityProfile: q }),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
  togglePerformancePanel: () => set((s) => ({ performancePanelVisible: !s.performancePanelVisible })),
  toggleKeyboardRef: () => set((s) => ({ keyboardRefVisible: !s.keyboardRefVisible })),
  setSelectedTool: (t) => set({ selectedTool: t }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
  toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
  toggleColourBlindMode: () => set((s) => ({ colourBlindMode: !s.colourBlindMode })),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setMusicVolume: (v) => set({ musicVolume: v }),
  setEnvironmentVolume: (v) => set({ environmentVolume: v }),
  setAnnouncementVolume: (v) => set({ announcementVolume: v }),
  setAlertVolume: (v) => set({ alertVolume: v }),
  setScenarios: (s) => set({ scenarios: s }),
  setSelectedScenario: (s) => set({ selectedScenario: s }),
  setRenderFps: (v) => set({ renderFps: v }),
  setVisibleAgents: (v) => set({ visibleAgents: v }),
}));
