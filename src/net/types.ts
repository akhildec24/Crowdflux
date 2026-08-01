export type AgentState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AgentData {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  dest: number;
  stress: number;
  state: AgentState;
  group: number;
  speed: number;
}

export interface IncidentData {
  id: string;
  x: number;
  z: number;
  kind: string;
  severity: number;
  active: boolean;
}

export interface EntityState {
  id: string;
  x: number;
  z: number;
  open: boolean;
  capacity: number;
  queue_length: number;
}

export interface BarrierData {
  id: string;
  x: number;
  z: number;
  rotation: number;
  length: number;
}

export interface SimStats {
  max_density: number;
  avg_queue_time: number;
  active_routes: number;
  queue_count: number;
  path_recalcs: number;
  agents_entered: number;
  agents_exited: number;
}

export interface Snapshot {
  tick: number;
  sim_time: number;
  agent_count: number;
  agents: AgentData[];
  incidents: IncidentData[];
  entrances: EntityState[];
  exits: EntityState[];
  barriers: BarrierData[];
  density_grid: number[];
  grid_width: number;
  grid_height: number;
  evacuation: boolean;
  weather: number;
  stats: SimStats;
}

export interface ServerMetrics {
  ticks_per_second: number;
  server_calc_time_us: number;
  snapshot_size_bytes: number;
  memory_usage_mb: number;
  active_routes: number;
  queue_count: number;
  path_recalcs_per_sec: number;
}

export interface ActionLogEntry {
  user: string;
  role: string;
  action: string;
  sim_time: number;
  details: string;
}

export interface ScenarioReport {
  max_crowd_density: number;
  avg_queue_time: number;
  longest_queue_time: number;
  exit_clearance_time: number;
  blocked_routes: number;
  critical_density_events: number;
  emergency_response_time: number;
  avg_walking_distance: number;
  rerouted_visitors: number;
  operator_actions: ActionLogEntry[];
  accessibility_issues: number;
  incident_timeline: IncidentData[];
}

export type ServerMessage =
  | ({ type: 'snapshot' } & Snapshot)
  | { type: 'session_created'; session_id: string }
  | { type: 'session_list'; data: any[] }
  | { type: 'joined'; session_id: string; role: string; operators: number }
  | { type: 'operator_joined'; name: string; role: string }
  | { type: 'operator_left'; name: string }
  | ({ type: 'action_log' } & ActionLogEntry)
  | ({ type: 'report' } & ScenarioReport)
  | ({ type: 'metrics' } & ServerMetrics)
  | { type: 'error'; message: string }
  | { type: 'pong' };

export interface WorldObjectDef {
  id: string;
  type: string;
  x: number;
  z: number;
  rotation: number;
  capacity: number;
}

export interface WorldDefinition {
  objects: WorldObjectDef[];
  targetPopulation: number;
  weather: number;
  seed: number;
}

export type ClientMessage =
  | { type: 'join'; session_id: string; role: string; name: string }
  | { type: 'create_session'; scenario: string; seed: number }
  | { type: 'list_sessions' }
  | { type: 'command'; action: string; [key: string]: any }
  | { type: 'set_speed'; speed: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'request_snapshot' }
  | { type: 'request_report' }
  | { type: 'set_world'; world: WorldDefinition }
  | { type: 'ping' };

export type OperatorRole = 'event_controller' | 'security_coordinator' | 'transport_coordinator' | 'medical_coordinator' | 'observer';

export type CameraMode = 'cinematic' | 'tactical' | 'free' | 'follow' | 'ground' | 'incident';

export type OverlayMode = 'normal' | 'density' | 'flow' | 'exit_pressure' | 'risk' | 'accessibility' | 'emergency';

export type QualityProfile = 'low' | 'medium' | 'high' | 'ultra';

export type AgentColourMode = 'destination' | 'group' | 'stress' | 'evacuation' | 'mobility' | 'route';

export interface ScenarioInfo {
  name: string;
  description: string;
  target_population: number;
}
