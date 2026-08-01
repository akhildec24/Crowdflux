use crate::sim::nav_graph::{NavGraph, NodeKind};
use crate::protocol::WorldDefinitionMsg;

pub struct ScenarioDef {
    pub name: &'static str,
    pub description: &'static str,
    pub initial_population: u32,
    pub target_population: u32,
    pub entry_rate: f32,
    pub weather: f32,
    pub evacuation: bool,
    pub scheduled_incidents: Vec<ScheduledIncident>,
}

#[derive(Clone)]
pub struct ScheduledIncident {
    pub time: f32,
    pub x: f32,
    pub z: f32,
    pub kind: &'static str,
    pub severity: f32,
}

pub fn scenarios() -> Vec<ScenarioDef> {
    vec![
        ScenarioDef {
            name: "Festival Arrival",
            description: "Visitors arrive gradually as gates open. Monitor queue formation and congestion at entrances.",
            initial_population: 0,
            target_population: 8000,
            entry_rate: 15.0,
            weather: 0.0,
            evacuation: false,
            scheduled_incidents: vec![],
        },
        ScenarioDef {
            name: "Headline Crowd Surge",
            description: "Crowd density peaks as the headline performance approaches. Monitor stage-front pressure and exit capacity.",
            initial_population: 6000,
            target_population: 12000,
            entry_rate: 25.0,
            weather: 0.0,
            evacuation: false,
            scheduled_incidents: vec![
                ScheduledIncident {
                    time: 60.0,
                    x: 0.0,
                    z: -30.0,
                    kind: "crowd_surge",
                    severity: 0.7,
                },
            ],
        },
        ScenarioDef {
            name: "Severe Weather",
            description: "Heavy rain and transport disruption. Visitors seek shelter; transport capacity reduced.",
            initial_population: 8000,
            target_population: 10000,
            entry_rate: 10.0,
            weather: 0.8,
            evacuation: false,
            scheduled_incidents: vec![
                ScheduledIncident {
                    time: 30.0,
                    x: 80.0,
                    z: 60.0,
                    kind: "transport_failure",
                    severity: 0.6,
                },
            ],
        },
        ScenarioDef {
            name: "Full Evacuation",
            description: "A major incident triggers full-site evacuation. Monitor exit throughput and emergency access.",
            initial_population: 10000,
            target_population: 10000,
            entry_rate: 0.0,
            weather: 0.0,
            evacuation: true,
            scheduled_incidents: vec![
                ScheduledIncident {
                    time: 10.0,
                    x: 0.0,
                    z: -20.0,
                    kind: "fire",
                    severity: 1.0,
                },
            ],
        },
    ]
}

pub fn build_festival_graph() -> NavGraph {
    let mut g = NavGraph::new();

    // Entrances (south side)
    let ent1 = g.add_node(-50.0, 90.0, NodeKind::Entrance, 50.0);
    let ent2 = g.add_node(50.0, 90.0, NodeKind::Entrance, 50.0);

    // Ticket gates
    let tk1 = g.add_node(-40.0, 75.0, NodeKind::Ticket, 30.0);
    let tk2 = g.add_node(40.0, 75.0, NodeKind::Ticket, 30.0);

    // Security checkpoints
    let sc1 = g.add_node(-30.0, 65.0, NodeKind::Security, 20.0);
    let sc2 = g.add_node(30.0, 65.0, NodeKind::Security, 20.0);

    // Main stage (north)
    let main_stage = g.add_node(0.0, -40.0, NodeKind::Stage, 5000.0);

    // Secondary stage (east)
    let sec_stage = g.add_node(60.0, 0.0, NodeKind::Stage, 2000.0);

    // Food areas
    let food1 = g.add_node(-30.0, 20.0, NodeKind::Food, 200.0);
    let food2 = g.add_node(30.0, 20.0, NodeKind::Food, 200.0);
    let food3 = g.add_node(0.0, 40.0, NodeKind::Food, 150.0);

    // Toilets
    let toilet1 = g.add_node(-45.0, 10.0, NodeKind::Toilet, 100.0);
    let toilet2 = g.add_node(45.0, 10.0, NodeKind::Toilet, 100.0);
    let toilet3 = g.add_node(-20.0, -10.0, NodeKind::Toilet, 80.0);

    // Medical
    let medical = g.add_node(-55.0, -20.0, NodeKind::Medical, 50.0);

    // Transport stops
    let bus = g.add_node(70.0, 70.0, NodeKind::Transport, 100.0);
    let rail = g.add_node(-70.0, 70.0, NodeKind::Transport, 150.0);

    // Parking
    let parking = g.add_node(0.0, 85.0, NodeKind::Parking, 300.0);

    // Exits (multiple sides)
    let exit1 = g.add_node(-60.0, 90.0, NodeKind::Exit, 80.0);
    let exit2 = g.add_node(60.0, 90.0, NodeKind::Exit, 80.0);
    let exit3 = g.add_node(-80.0, 0.0, NodeKind::Exit, 60.0);
    let exit4 = g.add_node(80.0, 0.0, NodeKind::Exit, 60.0);

    // Emergency exits
    let emex1 = g.add_node(-40.0, -60.0, NodeKind::EmergencyExit, 100.0);
    let emex2 = g.add_node(40.0, -60.0, NodeKind::EmergencyExit, 100.0);
    let emex3 = g.add_node(0.0, 50.0, NodeKind::EmergencyExit, 80.0);

    // Waypoints for navigation mesh
    let wp = [
        g.add_node(0.0, 60.0, NodeKind::Waypoint, 0.0),
        g.add_node(-15.0, 50.0, NodeKind::Waypoint, 0.0),
        g.add_node(15.0, 50.0, NodeKind::Waypoint, 0.0),
        g.add_node(-20.0, 35.0, NodeKind::Waypoint, 0.0),
        g.add_node(20.0, 35.0, NodeKind::Waypoint, 0.0),
        g.add_node(0.0, 30.0, NodeKind::Waypoint, 0.0),
        g.add_node(-15.0, 15.0, NodeKind::Waypoint, 0.0),
        g.add_node(15.0, 15.0, NodeKind::Waypoint, 0.0),
        g.add_node(0.0, 10.0, NodeKind::Waypoint, 0.0),
        g.add_node(-10.0, -10.0, NodeKind::Waypoint, 0.0),
        g.add_node(10.0, -10.0, NodeKind::Waypoint, 0.0),
        g.add_node(0.0, -20.0, NodeKind::Waypoint, 0.0),
        g.add_node(-25.0, -25.0, NodeKind::Waypoint, 0.0),
        g.add_node(25.0, -25.0, NodeKind::Waypoint, 0.0),
        g.add_node(40.0, 40.0, NodeKind::Waypoint, 0.0),
        g.add_node(-40.0, 40.0, NodeKind::Waypoint, 0.0),
        g.add_node(50.0, 30.0, NodeKind::Waypoint, 0.0),
        g.add_node(-50.0, 30.0, NodeKind::Waypoint, 0.0),
        g.add_node(55.0, 15.0, NodeKind::Waypoint, 0.0),
        g.add_node(-55.0, 15.0, NodeKind::Waypoint, 0.0),
    ];

    // Build edges — entrance to ticket to security to waypoints
    g.add_bidirectional(ent1, tk1);
    g.add_bidirectional(ent2, tk2);
    g.add_bidirectional(tk1, sc1);
    g.add_bidirectional(tk2, sc2);
    g.add_bidirectional(sc1, wp[0]);
    g.add_bidirectional(sc2, wp[0]);
    g.add_bidirectional(ent1, exit1);
    g.add_bidirectional(ent2, exit2);
    g.add_bidirectional(ent1, parking);
    g.add_bidirectional(ent2, parking);

    // Central waypoint network
    g.add_bidirectional(wp[0], wp[1]);
    g.add_bidirectional(wp[0], wp[2]);
    g.add_bidirectional(wp[1], wp[3]);
    g.add_bidirectional(wp[2], wp[4]);
    g.add_bidirectional(wp[0], wp[5]);
    g.add_bidirectional(wp[3], wp[5]);
    g.add_bidirectional(wp[4], wp[5]);
    g.add_bidirectional(wp[5], wp[6]);
    g.add_bidirectional(wp[5], wp[7]);
    g.add_bidirectional(wp[5], wp[8]);
    g.add_bidirectional(wp[6], wp[8]);
    g.add_bidirectional(wp[7], wp[8]);
    g.add_bidirectional(wp[8], wp[9]);
    g.add_bidirectional(wp[8], wp[10]);
    g.add_bidirectional(wp[8], wp[11]);
    g.add_bidirectional(wp[9], wp[11]);
    g.add_bidirectional(wp[10], wp[11]);
    g.add_bidirectional(wp[11], wp[12]);
    g.add_bidirectional(wp[11], wp[13]);

    // Stage connections
    g.add_bidirectional(wp[11], main_stage);
    g.add_bidirectional(wp[12], main_stage);
    g.add_bidirectional(wp[13], main_stage);
    g.add_bidirectional(wp[7], sec_stage);
    g.add_bidirectional(wp[4], sec_stage);

    // Food connections
    g.add_bidirectional(wp[3], food1);
    g.add_bidirectional(wp[4], food2);
    g.add_bidirectional(wp[5], food3);

    // Toilet connections
    g.add_bidirectional(wp[6], toilet1);
    g.add_bidirectional(wp[7], toilet2);
    g.add_bidirectional(wp[9], toilet3);

    // Medical
    g.add_bidirectional(wp[12], medical);
    g.add_bidirectional(wp[6], medical);

    // Transport
    g.add_bidirectional(sc2, bus);
    g.add_bidirectional(sc1, rail);
    g.add_bidirectional(wp[2], bus);
    g.add_bidirectional(wp[1], rail);

    // Exits
    g.add_bidirectional(wp[1], exit1);
    g.add_bidirectional(wp[2], exit2);
    g.add_bidirectional(wp[16], exit3);
    g.add_bidirectional(wp[17], exit3);
    g.add_bidirectional(wp[18], exit4);
    g.add_bidirectional(wp[19], exit4);

    // Emergency exits
    g.add_bidirectional(wp[12], emex1);
    g.add_bidirectional(wp[13], emex2);
    g.add_bidirectional(wp[0], emex3);
    g.add_bidirectional(wp[5], emex3);

    // Outer ring connections
    g.add_bidirectional(wp[14], wp[16]);
    g.add_bidirectional(wp[15], wp[17]);
    g.add_bidirectional(wp[16], wp[18]);
    g.add_bidirectional(wp[17], wp[19]);
    g.add_bidirectional(wp[14], wp[4]);
    g.add_bidirectional(wp[15], wp[3]);
    g.add_bidirectional(wp[18], wp[7]);
    g.add_bidirectional(wp[19], wp[6]);

    g
}

pub fn get_scenario(name: &str) -> Option<ScenarioDef> {
    scenarios().into_iter().find(|s| {
        s.name.to_lowercase().replace(' ', "_") == name.to_lowercase().replace(' ', "_")
    })
}

fn parse_node_kind(s: &str) -> NodeKind {
    match s {
        "entrance" => NodeKind::Entrance,
        "exit" => NodeKind::Exit,
        "emergency_exit" => NodeKind::EmergencyExit,
        "stage" => NodeKind::Stage,
        "food" => NodeKind::Food,
        "toilet" => NodeKind::Toilet,
        "medical" => NodeKind::Medical,
        "transport" => NodeKind::Transport,
        "parking" => NodeKind::Parking,
        "barrier" => NodeKind::Waypoint,
        _ => NodeKind::Waypoint,
    }
}

pub fn build_world_from_definition(world: &WorldDefinitionMsg) -> NavGraph {
    let mut g = NavGraph::new();

    // Add all user-placed objects as nodes
    let mut node_ids: Vec<u32> = Vec::new();
    for obj in &world.objects {
        let kind = parse_node_kind(&obj.kind);
        let cap = obj.capacity;
        let id = g.add_node(obj.x, obj.z, kind, cap);
        node_ids.push(id);
    }

    // Compute bounding box of placed objects
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
        // Add padding
        let pad = 30.0;
        (min_x - pad, max_x + pad, min_z - pad, max_z + pad)
    };

    // Adaptive grid spacing based on world size
    let world_w = (max_x - min_x).max(1.0);
    let world_h = (max_z - min_z).max(1.0);
    let world_size = world_w.max(world_h);
    let grid_step = (world_size / 12.0).clamp(10.0, 40.0) as i32;
    let connect_dist = grid_step as f32 * 1.8;
    let object_connect_dist = grid_step as f32 * 1.5;

    // Create a grid of waypoints for navigation coverage
    let mut wp_ids: Vec<u32> = Vec::new();
    let x_start = (min_x as i32 / grid_step) * grid_step;
    let z_start = (min_z as i32 / grid_step) * grid_step;
    let mut x = x_start;
    while x <= max_x as i32 + grid_step {
        let mut z = z_start;
        while z <= max_z as i32 + grid_step {
            let xf = x as f32;
            let zf = z as f32;
            let too_close = world.objects.iter().any(|o| {
                ((o.x - xf).powi(2) + (o.z - zf).powi(2)).sqrt() < 8.0
            });
            if !too_close {
                let wp = g.add_node(xf, zf, NodeKind::Waypoint, 0.0);
                wp_ids.push(wp);
            }
            z += grid_step;
        }
        x += grid_step;
    }

    // Connect waypoints to nearby waypoints
    for i in 0..wp_ids.len() {
        let (ix, iz) = {
            let n = &g.nodes[wp_ids[i] as usize];
            (n.x, n.z)
        };
        for j in (i + 1)..wp_ids.len() {
            let (jx, jz) = {
                let n = &g.nodes[wp_ids[j] as usize];
                (n.x, n.z)
            };
            let dist = ((ix - jx).powi(2) + (iz - jz).powi(2)).sqrt();
            if dist < connect_dist {
                g.add_bidirectional(wp_ids[i], wp_ids[j]);
            }
        }
    }

    // Connect user objects to nearby waypoints
    for &obj_node in &node_ids {
        let (ox, oz) = {
            let obj = &g.nodes[obj_node as usize];
            (obj.x, obj.z)
        };
        for &wp in &wp_ids {
            let (wx, wz) = {
                let w = &g.nodes[wp as usize];
                (w.x, w.z)
            };
            let dist = ((ox - wx).powi(2) + (oz - wz).powi(2)).sqrt();
            if dist < object_connect_dist {
                g.add_bidirectional(obj_node, wp);
            }
        }
    }

    // Connect nearby user objects to each other
    for i in 0..node_ids.len() {
        let (ix, iz) = {
            let n = &g.nodes[node_ids[i] as usize];
            (n.x, n.z)
        };
        for j in (i + 1)..node_ids.len() {
            let (jx, jz) = {
                let n = &g.nodes[node_ids[j] as usize];
                (n.x, n.z)
            };
            let dist = ((ix - jx).powi(2) + (iz - jz).powi(2)).sqrt();
            if dist < connect_dist {
                g.add_bidirectional(node_ids[i], node_ids[j]);
            }
        }
    }

    g
}
