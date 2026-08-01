use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "join")]
    Join { session_id: String, role: String, name: String },
    #[serde(rename = "create_session")]
    CreateSession { scenario: String, seed: u64 },
    #[serde(rename = "list_sessions")]
    ListSessions,
    #[serde(rename = "command")]
    Command(OperationCommand),
    #[serde(rename = "set_speed")]
    SetSpeed { speed: f32 },
    #[serde(rename = "pause")]
    Pause,
    #[serde(rename = "resume")]
    Resume,
    #[serde(rename = "request_snapshot")]
    RequestSnapshot,
    #[serde(rename = "request_report")]
    RequestReport,
    #[serde(rename = "set_world")]
    SetWorld { world: WorldDefinitionMsg },
    #[serde(rename = "ping")]
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldObjectMsg {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub x: f32,
    pub z: f32,
    pub rotation: f32,
    pub capacity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldDefinitionMsg {
    pub objects: Vec<WorldObjectMsg>,
    pub target_population: u32,
    pub weather: f32,
    pub seed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum OperationCommand {
    #[serde(rename = "toggle_entrance")]
    ToggleEntrance { id: String, open: bool },
    #[serde(rename = "toggle_exit")]
    ToggleExit { id: String, open: bool },
    #[serde(rename = "place_barrier")]
    PlaceBarrier { x: f32, z: f32, rotation: f32, length: f32 },
    #[serde(rename = "remove_barrier")]
    RemoveBarrier { id: String },
    #[serde(rename = "create_incident")]
    CreateIncident { x: f32, z: f32, kind: String, severity: f32 },
    #[serde(rename = "resolve_incident")]
    ResolveIncident { id: String },
    #[serde(rename = "broadcast_announcement")]
    BroadcastAnnouncement { message: String, target_area: Option<String> },
    #[serde(rename = "start_evacuation")]
    StartEvacuation,
    #[serde(rename = "stop_evacuation")]
    StopEvacuation,
    #[serde(rename = "set_weather")]
    SetWeather { intensity: f32 },
    #[serde(rename = "set_transport_capacity")]
    SetTransportCapacity { id: String, capacity: u32 },
    #[serde(rename = "set_attraction_popularity")]
    SetAttractionPopularity { id: String, popularity: f32 },
    #[serde(rename = "deploy_security")]
    DeploySecurity { x: f32, z: f32, count: u32 },
    #[serde(rename = "deploy_medical")]
    DeployMedical { x: f32, z: f32, count: u32 },
    #[serde(rename = "set_population")]
    SetPopulation { target: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "snapshot")]
    Snapshot(Snapshot),
    #[serde(rename = "session_created")]
    SessionCreated { session_id: String },
    #[serde(rename = "session_list")]
    SessionList(Vec<SessionInfo>),
    #[serde(rename = "joined")]
    Joined { session_id: String, role: String, operators: u32 },
    #[serde(rename = "operator_joined")]
    OperatorJoined { name: String, role: String },
    #[serde(rename = "operator_left")]
    OperatorLeft { name: String },
    #[serde(rename = "action_log")]
    ActionLog(ActionLogEntry),
    #[serde(rename = "report")]
    Report(ScenarioReport),
    #[serde(rename = "metrics")]
    Metrics(ServerMetrics),
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "pong")]
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub tick: u64,
    pub sim_time: f32,
    pub agent_count: u32,
    pub agents: Vec<AgentData>,
    pub incidents: Vec<IncidentData>,
    pub entrances: Vec<EntityState>,
    pub exits: Vec<EntityState>,
    pub barriers: Vec<BarrierData>,
    pub density_grid: Vec<f32>,
    pub grid_width: u32,
    pub grid_height: u32,
    pub evacuation: bool,
    pub weather: f32,
    pub stats: SimStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentData {
    pub id: u32,
    pub x: f32,
    pub z: f32,
    pub vx: f32,
    pub vz: f32,
    pub dest: u32,
    pub stress: f32,
    pub state: u8,
    pub group: u16,
    pub speed: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncidentData {
    pub id: String,
    pub x: f32,
    pub z: f32,
    pub kind: String,
    pub severity: f32,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityState {
    pub id: String,
    pub x: f32,
    pub z: f32,
    pub open: bool,
    pub capacity: u32,
    pub queue_length: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarrierData {
    pub id: String,
    pub x: f32,
    pub z: f32,
    pub rotation: f32,
    pub length: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimStats {
    pub max_density: f32,
    pub avg_queue_time: f32,
    pub active_routes: u32,
    pub queue_count: u32,
    pub path_recalcs: u32,
    pub agents_entered: u32,
    pub agents_exited: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub scenario: String,
    pub operators: u32,
    pub agent_count: u32,
    pub sim_time: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionLogEntry {
    pub user: String,
    pub role: String,
    pub action: String,
    pub sim_time: f32,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioReport {
    pub max_crowd_density: f32,
    pub avg_queue_time: f32,
    pub longest_queue_time: f32,
    pub exit_clearance_time: f32,
    pub blocked_routes: u32,
    pub critical_density_events: u32,
    pub emergency_response_time: f32,
    pub avg_walking_distance: f32,
    pub rerouted_visitors: u32,
    pub operator_actions: Vec<ActionLogEntry>,
    pub accessibility_issues: u32,
    pub incident_timeline: Vec<IncidentData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerMetrics {
    pub ticks_per_second: f32,
    pub server_calc_time_us: u64,
    pub snapshot_size_bytes: usize,
    pub memory_usage_mb: f32,
    pub active_routes: u32,
    pub queue_count: u32,
    pub path_recalcs_per_sec: u32,
}
