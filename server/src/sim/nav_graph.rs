use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct NavNode {
    pub id: u32,
    pub x: f32,
    pub z: f32,
    pub kind: NodeKind,
    pub capacity: f32,
    pub blocked: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeKind {
    Entrance,
    Exit,
    Stage,
    Food,
    Toilet,
    Medical,
    Ticket,
    Security,
    Transport,
    Parking,
    Waypoint,
    EmergencyExit,
}

impl NodeKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            NodeKind::Entrance => "entrance",
            NodeKind::Exit => "exit",
            NodeKind::Stage => "stage",
            NodeKind::Food => "food",
            NodeKind::Toilet => "toilet",
            NodeKind::Medical => "medical",
            NodeKind::Ticket => "ticket",
            NodeKind::Security => "security",
            NodeKind::Transport => "transport",
            NodeKind::Parking => "parking",
            NodeKind::Waypoint => "waypoint",
            NodeKind::EmergencyExit => "emergency_exit",
        }
    }
}

#[derive(Debug, Clone)]
pub struct NavEdge {
    pub to: u32,
    pub weight: f32,
    pub blocked: bool,
}

#[derive(Debug, Clone)]
pub struct NavGraph {
    pub nodes: Vec<NavNode>,
    pub edges: HashMap<u32, Vec<NavEdge>>,
}

impl NavGraph {
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            edges: HashMap::new(),
        }
    }

    pub fn add_node(&mut self, x: f32, z: f32, kind: NodeKind, capacity: f32) -> u32 {
        let id = self.nodes.len() as u32;
        self.nodes.push(NavNode {
            id,
            x,
            z,
            kind,
            capacity,
            blocked: false,
        });
        self.edges.insert(id, Vec::new());
        id
    }

    pub fn add_edge(&mut self, from: u32, to: u32, weight: f32) {
        self.edges.entry(from).or_default().push(NavEdge {
            to,
            weight,
            blocked: false,
        });
        self.edges.entry(to).or_default().push(NavEdge {
            to: from,
            weight,
            blocked: false,
        });
    }

    pub fn add_bidirectional(&mut self, from: u32, to: u32) {
        let dx = self.nodes[from as usize].x - self.nodes[to as usize].x;
        let dz = self.nodes[from as usize].z - self.nodes[to as usize].z;
        let dist = (dx * dx + dz * dz).sqrt();
        self.add_edge(from, to, dist);
    }

    pub fn block_node(&mut self, id: u32) {
        if let Some(node) = self.nodes.get_mut(id as usize) {
            node.blocked = true;
        }
    }

    pub fn unblock_node(&mut self, id: u32) {
        if let Some(node) = self.nodes.get_mut(id as usize) {
            node.blocked = false;
        }
    }

    pub fn block_edges_to(&mut self, node_id: u32) {
        for edges in self.edges.values_mut() {
            for edge in edges.iter_mut() {
                if edge.to == node_id {
                    edge.blocked = true;
                }
            }
        }
    }

    pub fn unblock_edges_to(&mut self, node_id: u32) {
        for edges in self.edges.values_mut() {
            for edge in edges.iter_mut() {
                if edge.to == node_id {
                    edge.blocked = false;
                }
            }
        }
    }

    pub fn find_path(&self, start: u32, goal: u32) -> Option<Vec<u32>> {
        if start == goal {
            return Some(vec![start]);
        }
        if self.nodes[start as usize].blocked || self.nodes[goal as usize].blocked {
            return None;
        }

        let mut open: Vec<(f32, u32)> = Vec::new();
        let mut g_score: HashMap<u32, f32> = HashMap::new();
        let mut came_from: HashMap<u32, u32> = HashMap::new();
        let mut closed: HashMap<u32, bool> = HashMap::new();

        let goal_pos = &self.nodes[goal as usize];
        g_score.insert(start, 0.0);
        open.push((0.0, start));

        while let Some((_, current)) = {
            open.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
            if open.is_empty() {
                None
            } else {
                Some(open.remove(0))
            }
        } {
            if current == goal {
                let mut path = vec![current];
                let mut node = current;
                while let Some(&prev) = came_from.get(&node) {
                    path.push(prev);
                    node = prev;
                }
                path.reverse();
                return Some(path);
            }

            closed.insert(current, true);

            if let Some(edges) = self.edges.get(&current) {
                for edge in edges.iter() {
                    if edge.blocked {
                        continue;
                    }
                    if self.nodes[edge.to as usize].blocked {
                        continue;
                    }
                    if closed.get(&edge.to).is_some() {
                        continue;
                    }

                    let tentative_g = g_score[&current] + edge.weight;
                    let is_better = g_score.get(&edge.to).is_none()
                        || tentative_g < *g_score.get(&edge.to).unwrap();

                    if is_better {
                        came_from.insert(edge.to, current);
                        g_score.insert(edge.to, tentative_g);
                        let neighbor = &self.nodes[edge.to as usize];
                        let h = ((neighbor.x - goal_pos.x).powi(2)
                            + (neighbor.z - goal_pos.z).powi(2))
                        .sqrt();
                        let f = tentative_g + h;
                        open.push((f, edge.to));
                    }
                }
            }
        }

        None
    }

    pub fn nodes_by_kind(&self, kind: NodeKind) -> Vec<u32> {
        self.nodes
            .iter()
            .filter(|n| n.kind == kind && !n.blocked)
            .map(|n| n.id)
            .collect()
    }

    pub fn nearest_node(&self, x: f32, z: f32, kind: Option<NodeKind>) -> u32 {
        let mut best = 0;
        let mut best_dist = f32::MAX;
        for node in &self.nodes {
            if node.blocked {
                continue;
            }
            if let Some(k) = kind {
                if node.kind != k {
                    continue;
                }
            }
            let dx = node.x - x;
            let dz = node.z - z;
            let d = dx * dx + dz * dz;
            if d < best_dist {
                best_dist = d;
                best = node.id;
            }
        }
        best
    }
}
