use std::collections::HashMap;
use std::time::Instant;

use crate::protocol::*;
use crate::sim::agent::{Agent, AgentState};
use crate::sim::density::DensityGrid;
use crate::sim::nav_graph::{NavGraph, NodeKind};
use crate::sim::rng::DeterministicRng;
use crate::sim::scenario::{build_festival_graph, build_world_from_definition, get_scenario, ScenarioDef, ScheduledIncident};

pub struct SimulationWorld {
    pub graph: NavGraph,
    pub agents: Vec<Agent>,
    pub density: DensityGrid,
    pub rng: DeterministicRng,
    pub tick: u64,
    pub sim_time: f32,
    pub speed: f32,
    pub paused: bool,
    pub evacuation: bool,
    pub weather: f32,
    pub seed: u64,
    pub scenario_name: String,
    pub target_population: u32,
    pub entry_rate: f32,
    pub entry_accumulator: f32,
    pub next_agent_id: u32,
    pub incidents: Vec<IncidentData>,
    pub barriers: Vec<BarrierData>,
    pub entrance_states: HashMap<String, bool>,
    pub exit_states: HashMap<String, bool>,
    pub action_log: Vec<ActionLogEntry>,
    pub scheduled_incidents: Vec<ScheduledIncident>,
    pub triggered_incidents: Vec<usize>,
    pub stats: SimStats,
    pub max_density_seen: f32,
    pub critical_density_events: u32,
    pub last_tick_time: Instant,
    pub ticks_per_second: f32,
    pub server_calc_time_us: u64,
    pub path_recalcs: u32,
    pub path_recalc_accumulator: u32,
    pub transport_capacities: HashMap<String, u32>,
    pub attraction_popularities: HashMap<String, f32>,
    pub agents_entered: u32,
    pub agents_exited: u32,
    pub total_queue_time: f32,
    pub queue_count: u32,
    pub max_queue_time: f32,
    pub total_walking_distance: f32,
    pub rerouted_count: u32,
}

impl SimulationWorld {
    pub fn new(scenario_name: &str, seed: u64) -> Self {
        let graph = build_festival_graph();
        let scenario = get_scenario(scenario_name).unwrap_or_else(|| {
            get_scenario("Festival Arrival").unwrap()
        });

        let density = DensityGrid::new(200.0, 5.0);
        let mut rng = DeterministicRng::new(seed);

        let mut agents = Vec::new();
        for i in 0..scenario.initial_population {
            let entrance_nodes = graph.nodes_by_kind(NodeKind::Entrance);
            if entrance_nodes.is_empty() {
                break;
            }
            let ent_idx = rng.gen_range_u32(0, entrance_nodes.len() as u32);
            let ent = &graph.nodes[entrance_nodes[ent_idx as usize] as usize];
            let x = ent.x + rng.gen_range(-5.0, 5.0);
            let z = ent.z + rng.gen_range(-5.0, 5.0);
            agents.push(Agent::new(i, x, z, &mut rng));
        }

        let mut entrance_states = HashMap::new();
        for node in &graph.nodes {
            if node.kind == NodeKind::Entrance {
                entrance_states.insert(format!("entrance_{}", node.id), true);
            }
        }

        let mut exit_states = HashMap::new();
        for node in &graph.nodes {
            if node.kind == NodeKind::Exit || node.kind == NodeKind::EmergencyExit {
                exit_states.insert(format!("exit_{}", node.id), true);
            }
        }

        let mut transport_capacities = HashMap::new();
        for node in &graph.nodes {
            if node.kind == NodeKind::Transport {
                transport_capacities.insert(format!("transport_{}", node.id), 100);
            }
        }

        Self {
            graph,
            agents,
            density,
            rng,
            tick: 0,
            sim_time: 0.0,
            speed: 1.0,
            paused: false,
            evacuation: scenario.evacuation,
            weather: scenario.weather,
            seed,
            scenario_name: scenario.name.to_string(),
            target_population: scenario.target_population,
            entry_rate: scenario.entry_rate,
            entry_accumulator: 0.0,
            next_agent_id: scenario.initial_population,
            incidents: Vec::new(),
            barriers: Vec::new(),
            entrance_states,
            exit_states,
            action_log: Vec::new(),
            scheduled_incidents: scenario.scheduled_incidents.clone(),
            triggered_incidents: Vec::new(),
            stats: SimStats {
                max_density: 0.0,
                avg_queue_time: 0.0,
                active_routes: 0,
                queue_count: 0,
                path_recalcs: 0,
                agents_entered: 0,
                agents_exited: 0,
            },
            max_density_seen: 0.0,
            critical_density_events: 0,
            last_tick_time: Instant::now(),
            ticks_per_second: 0.0,
            server_calc_time_us: 0,
            path_recalcs: 0,
            path_recalc_accumulator: 0,
            transport_capacities,
            attraction_popularities: HashMap::new(),
            agents_entered: scenario.initial_population,
            agents_exited: 0,
            total_queue_time: 0.0,
            queue_count: 0,
            max_queue_time: 0.0,
            total_walking_distance: 0.0,
            rerouted_count: 0,
        }
    }

    pub fn rebuild_from_world(&mut self, world: &WorldDefinitionMsg) {
        // Compute world bounds for density grid
        let (min_x, max_x, min_z, max_z) = if world.objects.is_empty() {
            (-100.0, 100.0, -100.0, 100.0)
        } else {
            let mut min_x = f32::MAX;
            let mut max_x = f32::MIN;
            let mut min_z = f32::MAX;
            let mut max_z = f32::MIN;
            for obj in &world.objects {
                min_x = min_x.min(obj.x);
                max_x = max_x.max(obj.x);
                min_z = min_z.min(obj.z);
                max_z = max_z.max(obj.z);
            }
            (min_x - 50.0, max_x + 50.0, min_z - 50.0, max_z + 50.0)
        };
        let grid_size = ((max_x - min_x).max(max_z - min_z)).max(200.0);

        self.graph = build_world_from_definition(world);
        self.density = DensityGrid::new(grid_size, 5.0);
        self.rng = DeterministicRng::new(world.seed);
        self.tick = 0;
        self.sim_time = 0.0;
        self.paused = false;
        self.evacuation = false;
        self.weather = world.weather;
        self.seed = world.seed;
        self.target_population = world.target_population;
        self.entry_rate = (world.target_population as f32 / 300.0).max(5.0).min(30.0);
        self.entry_accumulator = 0.0;
        self.agents.clear();
        self.next_agent_id = 0;
        self.incidents.clear();
        self.barriers.clear();
        self.scheduled_incidents.clear();
        self.triggered_incidents.clear();
        self.stats = SimStats {
            max_density: 0.0,
            avg_queue_time: 0.0,
            active_routes: 0,
            queue_count: 0,
            path_recalcs: 0,
            agents_entered: 0,
            agents_exited: 0,
        };
        self.max_density_seen = 0.0;
        self.critical_density_events = 0;
        self.path_recalcs = 0;
        self.path_recalc_accumulator = 0;
        self.agents_entered = 0;
        self.agents_exited = 0;
        self.total_queue_time = 0.0;
        self.queue_count = 0;
        self.max_queue_time = 0.0;
        self.total_walking_distance = 0.0;
        self.rerouted_count = 0;

        // Rebuild entrance/exit/transport state maps
        self.entrance_states.clear();
        for node in &self.graph.nodes {
            if node.kind == NodeKind::Entrance {
                self.entrance_states.insert(format!("entrance_{}", node.id), true);
            }
        }
        self.exit_states.clear();
        for node in &self.graph.nodes {
            if node.kind == NodeKind::Exit || node.kind == NodeKind::EmergencyExit {
                self.exit_states.insert(format!("exit_{}", node.id), true);
            }
        }
        self.transport_capacities.clear();
        for node in &self.graph.nodes {
            if node.kind == NodeKind::Transport {
                self.transport_capacities.insert(format!("transport_{}", node.id), 100);
            }
        }
        self.attraction_popularities.clear();
    }

    pub fn set_speed(&mut self, speed: f32) {
        self.speed = speed;
    }

    pub fn pause(&mut self) {
        self.paused = true;
    }

    pub fn resume(&mut self) {
        self.paused = false;
    }

    pub fn start_evacuation(&mut self) {
        self.evacuation = true;
        let agent_count = self.agents.len();
        for agent in &mut self.agents {
            if agent.state != AgentState::Leaving {
                agent.rerouted = true;
            }
        }
        self.rerouted_count += agent_count as u32;
    }

    pub fn stop_evacuation(&mut self) {
        self.evacuation = false;
    }

    pub fn set_weather(&mut self, intensity: f32) {
        self.weather = intensity.max(0.0).min(1.0);
    }

    pub fn create_incident(&mut self, x: f32, z: f32, kind: &str, severity: f32) {
        let id = format!("incident_{}", self.tick);
        self.incidents.push(IncidentData {
            id: id.clone(),
            x,
            z,
            kind: kind.to_string(),
            severity,
            active: true,
        });

        // Agents near the incident gain stress
        for agent in &mut self.agents {
            let dx = agent.x - x;
            let dz = agent.z - z;
            let dist = (dx * dx + dz * dz).sqrt();
            if dist < 20.0 {
                agent.stress = (agent.stress + (1.0 - dist / 20.0) * severity * 0.5).min(1.0);
            }
        }
    }

    pub fn resolve_incident(&mut self, id: &str) {
        for inc in &mut self.incidents {
            if inc.id == id {
                inc.active = false;
            }
        }
    }

    pub fn place_barrier(&mut self, x: f32, z: f32, rotation: f32, length: f32) {
        let id = format!("barrier_{}", self.tick);
        self.barriers.push(BarrierData {
            id,
            x,
            z,
            rotation,
            length,
        });

        // Block nearby nav nodes
        let nearest = self.graph.nearest_node(x, z, None);
        let node = &self.graph.nodes[nearest as usize];
        let dx = node.x - x;
        let dz = node.z - z;
        if (dx * dx + dz * dz).sqrt() < length {
            self.graph.block_node(nearest);
            self.graph.block_edges_to(nearest);
        }
    }

    pub fn remove_barrier(&mut self, id: &str) {
        self.barriers.retain(|b| b.id != id);
    }

    pub fn toggle_entrance(&mut self, id: &str, open: bool) {
        self.entrance_states.insert(id.to_string(), open);
        if let Some(node_id) = id.strip_prefix("entrance_") {
            if let Ok(nid) = node_id.parse::<u32>() {
                if open {
                    self.graph.unblock_node(nid);
                    self.graph.unblock_edges_to(nid);
                } else {
                    self.graph.block_node(nid);
                    self.graph.block_edges_to(nid);
                }
            }
        }
    }

    pub fn toggle_exit(&mut self, id: &str, open: bool) {
        self.exit_states.insert(id.to_string(), open);
        if let Some(node_id) = id.strip_prefix("exit_") {
            if let Ok(nid) = node_id.parse::<u32>() {
                if open {
                    self.graph.unblock_node(nid);
                    self.graph.unblock_edges_to(nid);
                } else {
                    self.graph.block_node(nid);
                    self.graph.block_edges_to(nid);
                }
            }
        }
    }

    pub fn set_transport_capacity(&mut self, id: &str, capacity: u32) {
        self.transport_capacities.insert(id.to_string(), capacity);
    }

    pub fn log_action(&mut self, user: &str, role: &str, action: &str, details: &str) {
        self.action_log.push(ActionLogEntry {
            user: user.to_string(),
            role: role.to_string(),
            action: action.to_string(),
            sim_time: self.sim_time,
            details: details.to_string(),
        });
    }

    fn spawn_agents(&mut self, dt: f32) {
        if self.agents.len() >= self.target_population as usize {
            return;
        }
        self.entry_accumulator += self.entry_rate * dt;
        let entrance_nodes = self.graph.nodes_by_kind(NodeKind::Entrance);
        if entrance_nodes.is_empty() {
            if self.tick % 40 == 0 {
                println!("[DEBUG] No entrance nodes! agents={}, target={}, tick={}", self.agents.len(), self.target_population, self.tick);
            }
            return;
        }
        while self.entry_accumulator >= 1.0 {
            self.entry_accumulator -= 1.0;
            let ent_idx = self.rng.gen_range_u32(0, entrance_nodes.len() as u32);
            let ent = &self.graph.nodes[entrance_nodes[ent_idx as usize] as usize];
            let x = ent.x + self.rng.gen_range(-5.0, 5.0);
            let z = ent.z + self.rng.gen_range(-5.0, 5.0);
            let id = self.next_agent_id;
            self.next_agent_id += 1;
            self.agents.push(Agent::new(id, x, z, &mut self.rng));
            self.agents_entered += 1;
        }
        if self.tick % 40 == 0 {
            let ent = &self.graph.nodes[entrance_nodes[0] as usize];
            println!("[DEBUG] tick={} agents={} entrances={} entry_rate={:.1} first_entrance=({:.1},{:.1})", self.tick, self.agents.len(), entrance_nodes.len(), self.entry_rate, ent.x, ent.z);
        }
    }

    fn check_scheduled_incidents(&mut self) {
        let mut to_trigger: Vec<(usize, f32, f32, String, f32)> = Vec::new();
        for (i, inc) in self.scheduled_incidents.iter().enumerate() {
            if self.sim_time >= inc.time && !self.triggered_incidents.contains(&i) {
                self.triggered_incidents.push(i);
                to_trigger.push((i, inc.x, inc.z, inc.kind.to_string(), inc.severity));
            }
        }
        for (_, x, z, kind, severity) in to_trigger {
            self.create_incident(x, z, &kind, severity);
            if kind == "fire" {
                self.start_evacuation();
            }
        }
    }

    pub fn tick_sim(&mut self, dt: f32) {
        if self.paused {
            return;
        }

        let start = Instant::now();
        let effective_dt = dt * self.speed;

        self.tick += 1;
        self.sim_time += effective_dt;

        self.check_scheduled_incidents();
        self.spawn_agents(effective_dt);

        // Clear and rebuild density grid
        self.density.clear();

        // First pass: compute density
        for agent in &self.agents {
            self.density.add_agent(agent.x, agent.z, agent.vx, agent.vz);
        }

        let max_d = self.density.max_density();
        if max_d > self.max_density_seen {
            self.max_density_seen = max_d;
        }
        let cell_area = self.density.cell_size * self.density.cell_size;
        let max_density_per_m2 = max_d / cell_area;
        if max_density_per_m2 > 4.0 {
            self.critical_density_events += 1;
        }

        // Update agents sequentially for determinism
        let graph = &self.graph;
        let density_grid = &self.density;
        let weather = self.weather;
        let evacuation = self.evacuation;

        let mut queue_count = 0u32;
        let mut total_queue = 0.0f32;
        let mut total_walking = 0.0f32;
        let mut recalc_count = 0u32;

        for agent in self.agents.iter_mut() {
            let density_factor = density_grid.density_factor(agent.x, agent.z);

            let prev_path_len = agent.path.len();

            // Per-agent deterministic RNG
            let mut agent_rng = DeterministicRng::new(self.seed.wrapping_add(agent.id as u64 * 0x9E3779B9));

            agent.update(effective_dt, graph, density_factor, weather, evacuation, &mut agent_rng);

            if agent.path.len() != prev_path_len {
                recalc_count += 1;
            }

            match agent.state {
                AgentState::Queuing => {
                    queue_count += 1;
                    total_queue += agent.queue_time;
                    if agent.queue_time > self.max_queue_time {
                        self.max_queue_time = agent.queue_time;
                    }
                }
                AgentState::Leaving => {
                    // Agent has exited
                }
                _ => {}
            }
            total_walking += agent.walking_distance;
        }

        // Remove agents that have left
        let before = self.agents.len();
        self.agents.retain(|a| a.state != AgentState::Leaving);
        let removed = before - self.agents.len();
        self.agents_exited += removed as u32;

        self.path_recalcs += recalc_count;
        self.path_recalc_accumulator += recalc_count;

        self.queue_count = queue_count;
        self.total_queue_time += total_queue * effective_dt;
        self.total_walking_distance = total_walking;

        // Update stats
        self.stats.max_density = self.max_density_seen;
        self.stats.avg_queue_time = if self.agents_exited > 0 {
            self.total_queue_time / self.ag_exited() as f32
        } else {
            0.0
        };
        self.stats.active_routes = self.graph.edges.len() as u32;
        self.stats.queue_count = queue_count;
        self.stats.path_recalcs = self.path_recalcs;
        self.stats.agents_entered = self.agents_entered;
        self.stats.agents_exited = self.agents_exited;

        let elapsed = start.elapsed();
        self.server_calc_time_us = elapsed.as_micros() as u64;

        // Update TPS
        let now = Instant::now();
        let real_dt = now.duration_since(self.last_tick_time).as_secs_f32();
        if real_dt > 0.0 {
            self.ticks_per_second = self.ticks_per_second * 0.9 + (1.0 / real_dt) * 0.1;
        }
        self.last_tick_time = now;
    }

    fn ag_exited(&self) -> u32 {
        self.agents_exited
    }

    pub fn build_snapshot(&self) -> Snapshot {
        let agents: Vec<AgentData> = self
            .agents
            .iter()
            .map(|a| AgentData {
                id: a.id,
                x: a.x,
                z: a.z,
                vx: a.vx,
                vz: a.vz,
                dest: a.dest_node,
                stress: a.stress,
                state: a.state.as_u8(),
                group: a.group,
                speed: a.speed,
            })
            .collect();

        let entrances: Vec<EntityState> = self
            .graph
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Entrance)
            .map(|n| EntityState {
                id: format!("entrance_{}", n.id),
                x: n.x,
                z: n.z,
                open: !n.blocked,
                capacity: n.capacity as u32,
                queue_length: 0,
            })
            .collect();

        let exits: Vec<EntityState> = self
            .graph
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Exit || n.kind == NodeKind::EmergencyExit)
            .map(|n| EntityState {
                id: format!("exit_{}", n.id),
                x: n.x,
                z: n.z,
                open: !n.blocked,
                capacity: n.capacity as u32,
                queue_length: 0,
            })
            .collect();

        Snapshot {
            tick: self.tick,
            sim_time: self.sim_time,
            agent_count: self.agents.len() as u32,
            agents,
            incidents: self.incidents.iter().filter(|i| i.active).cloned().collect(),
            entrances,
            exits,
            barriers: self.barriers.clone(),
            density_grid: self.density.cells.clone(),
            grid_width: self.density.width,
            grid_height: self.density.height,
            evacuation: self.evacuation,
            weather: self.weather,
            stats: self.stats.clone(),
        }
    }

    pub fn build_metrics(&self, snapshot_size: usize) -> ServerMetrics {
        ServerMetrics {
            ticks_per_second: self.ticks_per_second,
            server_calc_time_us: self.server_calc_time_us,
            snapshot_size_bytes: snapshot_size,
            memory_usage_mb: 0.0, // Would need platform-specific code
            active_routes: self.graph.edges.len() as u32,
            queue_count: self.queue_count,
            path_recalcs_per_sec: self.path_recalc_accumulator,
        }
    }

    pub fn build_report(&self) -> ScenarioReport {
        ScenarioReport {
            max_crowd_density: self.max_density_seen,
            avg_queue_time: if self.agents_exited > 0 {
                self.total_queue_time / self.agents_exited as f32
            } else {
                0.0
            },
            longest_queue_time: self.max_queue_time,
            exit_clearance_time: self.sim_time,
            blocked_routes: self.graph.edges.values().flatten().filter(|e| e.blocked).count() as u32,
            critical_density_events: self.critical_density_events,
            emergency_response_time: 0.0,
            avg_walking_distance: if !self.agents.is_empty() {
                self.total_walking_distance / self.agents.len() as f32
            } else {
                0.0
            },
            rerouted_visitors: self.rerouted_count,
            operator_actions: self.action_log.clone(),
            accessibility_issues: 0,
            incident_timeline: self.incidents.clone(),
        }
    }
}
