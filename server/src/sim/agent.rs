use crate::sim::nav_graph::{NavGraph, NodeKind};
use crate::sim::rng::DeterministicRng;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentState {
    Entering,
    Moving,
    Queuing,
    AtDestination,
    Leaving,
    Evacuating,
    Panicking,
}

impl AgentState {
    pub fn as_u8(&self) -> u8 {
        match self {
            AgentState::Entering => 0,
            AgentState::Moving => 1,
            AgentState::Queuing => 2,
            AgentState::AtDestination => 3,
            AgentState::Leaving => 4,
            AgentState::Evacuating => 5,
            AgentState::Panicking => 6,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Agent {
    pub id: u32,
    pub x: f32,
    pub z: f32,
    pub vx: f32,
    pub vz: f32,
    pub dest_node: u32,
    pub path: Vec<u32>,
    pub path_idx: usize,
    pub speed: f32,
    pub base_speed: f32,
    pub stress: f32,
    pub patience: f32,
    pub state: AgentState,
    pub group: u16,
    pub mobility: f32,
    pub familiarity: f32,
    pub queue_time: f32,
    pub dwell_time: f32,
    pub dest_kind: NodeKind,
    pub next_dest_choice: f32,
    pub walking_distance: f32,
    pub rerouted: bool,
}

impl Agent {
    pub fn new(id: u32, x: f32, z: f32, rng: &mut DeterministicRng) -> Self {
        let base_speed = rng.gen_range(1.0, 1.6);
        let mobility = rng.gen_range(0.7, 1.0);
        let familiarity = rng.gen_range(0.3, 1.0);
        let patience = rng.gen_range(10.0, 60.0);
        let group = rng.gen_range_u32(0, 8) as u16;

        Self {
            id,
            x,
            z,
            vx: 0.0,
            vz: 0.0,
            dest_node: 0,
            path: Vec::new(),
            path_idx: 0,
            speed: base_speed * mobility,
            base_speed,
            stress: 0.0,
            patience,
            state: AgentState::Entering,
            group,
            mobility,
            familiarity,
            queue_time: 0.0,
            dwell_time: 0.0,
            dest_kind: NodeKind::Stage,
            next_dest_choice: 0.0,
            walking_distance: 0.0,
            rerouted: false,
        }
    }

    pub fn set_destination(&mut self, dest: u32, graph: &NavGraph) {
        let start = graph.nearest_node(self.x, self.z, None);
        if let Some(path) = graph.find_path(start, dest) {
            self.path = path;
            self.path_idx = 0;
            self.dest_node = dest;
            self.state = AgentState::Moving;
        } else {
            self.dest_node = dest;
            self.state = AgentState::Moving;
            self.path = vec![start, dest];
            self.path_idx = 0;
        }
    }

    pub fn pick_destination(&mut self, graph: &NavGraph, rng: &mut DeterministicRng, evacuation: bool) {
        if evacuation {
            let exits = graph.nodes_by_kind(NodeKind::EmergencyExit);
            if exits.is_empty() {
                let exits = graph.nodes_by_kind(NodeKind::Exit);
                if !exits.is_empty() {
                    let idx = rng.gen_range_u32(0, exits.len() as u32);
                    self.dest_kind = NodeKind::Exit;
                    self.set_destination(exits[idx as usize], graph);
                    self.state = AgentState::Evacuating;
                }
            } else {
                let nearest = exits.iter().min_by_key(|&&e| {
                    let dx = graph.nodes[e as usize].x - self.x;
                    let dz = graph.nodes[e as usize].z - self.z;
                    ((dx * dx + dz * dz) * 1000.0) as u32
                }).copied().unwrap_or(exits[0]);
                self.dest_kind = NodeKind::EmergencyExit;
                self.set_destination(nearest, graph);
                self.state = AgentState::Evacuating;
            }
            return;
        }

        let roll = rng.gen_range(0.0, 1.0);
        let kind = if roll < 0.35 {
            NodeKind::Stage
        } else if roll < 0.55 {
            NodeKind::Food
        } else if roll < 0.70 {
            NodeKind::Toilet
        } else if roll < 0.80 {
            NodeKind::Medical
        } else if roll < 0.90 {
            NodeKind::Transport
        } else {
            NodeKind::Exit
        };

        let nodes = graph.nodes_by_kind(kind);
        if nodes.is_empty() {
            let nodes = graph.nodes_by_kind(NodeKind::Stage);
            if nodes.is_empty() {
                return;
            }
            self.dest_kind = NodeKind::Stage;
            let idx = rng.gen_range_u32(0, nodes.len() as u32);
            self.set_destination(nodes[idx as usize], graph);
        } else {
            self.dest_kind = kind;
            let idx = rng.gen_range_u32(0, nodes.len() as u32);
            self.set_destination(nodes[idx as usize], graph);
        }
    }

    pub fn update(
        &mut self,
        dt: f32,
        graph: &NavGraph,
        density_factor: f32,
        weather: f32,
        evacuation: bool,
        rng: &mut DeterministicRng,
    ) {
        match self.state {
            AgentState::Entering => {
                self.pick_destination(graph, rng, evacuation);
            }
            AgentState::Moving | AgentState::Evacuating => {
                if self.path.is_empty() || self.path_idx >= self.path.len() {
                    self.state = AgentState::AtDestination;
                    self.dwell_time = rng.gen_range(2.0, 15.0);
                    return;
                }

                let target = &graph.nodes[self.path[self.path_idx] as usize];
                let dx = target.x - self.x;
                let dz = target.z - self.z;
                let dist = (dx * dx + dz * dz).sqrt();

                if dist < 2.0 {
                    self.path_idx += 1;
                    if self.path_idx >= self.path.len() {
                        self.state = AgentState::AtDestination;
                        self.dwell_time = rng.gen_range(2.0, 15.0);
                        return;
                    }
                }

                let speed_mod = if self.state == AgentState::Evacuating {
                    1.5
                } else {
                    1.0
                };

                let weather_mod = 1.0 - weather * 0.3;
                let density_mod = 1.0 - density_factor * 0.6;
                let stress_mod = 1.0 + self.stress * 0.2;

                let effective_speed = self.base_speed
                    * self.mobility
                    * speed_mod
                    * weather_mod
                    * density_mod.max(0.2)
                    * stress_mod;

                self.speed = effective_speed;

                if dist > 0.001 {
                    let nx = dx / dist;
                    let nz = dz / dist;
                    self.vx = nx * effective_speed;
                    self.vz = nz * effective_speed;
                    self.x += self.vx * dt;
                    self.z += self.vz * dt;
                    self.walking_distance += effective_speed * dt;
                }

                self.stress = (self.stress + density_factor * dt * 0.1
                    - dt * 0.05).max(0.0).min(1.0);

                if self.state == AgentState::Evacuating && self.stress > 0.8 {
                    self.state = AgentState::Panicking;
                }
            }
            AgentState::Panicking => {
                if self.path.is_empty() || self.path_idx >= self.path.len() {
                    self.pick_destination(graph, rng, true);
                    return;
                }

                let target = &graph.nodes[self.path[self.path_idx] as usize];
                let dx = target.x - self.x;
                let dz = target.z - self.z;
                let dist = (dx * dx + dz * dz).sqrt();

                if dist < 2.0 {
                    self.path_idx += 1;
                }

                let panic_speed = self.base_speed * self.mobility * 1.8;
                self.speed = panic_speed;

                if dist > 0.001 {
                    let nx = dx / dist;
                    let nz = dz / dist;
                    self.vx = nx * panic_speed;
                    self.vz = nz * panic_speed;
                    self.x += self.vx * dt;
                    self.z += self.vz * dt;
                    self.walking_distance += panic_speed * dt;
                }

                self.stress = (self.stress - dt * 0.02).max(0.5).min(1.0);
                if self.stress < 0.6 {
                    self.state = AgentState::Evacuating;
                }
            }
            AgentState::AtDestination => {
                self.dwell_time -= dt;
                self.vx = 0.0;
                self.vz = 0.0;
                if self.dwell_time <= 0.0 {
                    if self.dest_kind == NodeKind::Exit || self.dest_kind == NodeKind::EmergencyExit {
                        self.state = AgentState::Leaving;
                    } else {
                        self.pick_destination(graph, rng, evacuation);
                    }
                }
            }
            AgentState::Queuing => {
                self.queue_time += dt;
                self.vx = 0.0;
                self.vz = 0.0;
                self.stress = (self.stress + dt * 0.02).min(1.0);
                if self.queue_time > self.patience {
                    self.pick_destination(graph, rng, evacuation);
                    self.queue_time = 0.0;
                }
            }
            AgentState::Leaving => {
                self.vx = 0.0;
                self.vz = 0.0;
            }
        }
    }
}
