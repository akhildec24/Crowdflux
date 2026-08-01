pub mod ws;

use axum::{
    routing::{get, post},
    Router,
};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub sessions: DashMap<String, Arc<RwLock<Session>>>,
}

pub struct Session {
    pub id: String,
    pub world: crate::sim::world::SimulationWorld,
    pub operators: Vec<Operator>,
    pub action_history: Vec<crate::protocol::ActionLogEntry>,
}

pub struct Operator {
    pub name: String,
    pub role: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sessions: DashMap::new(),
        }
    }
}

pub fn create_router(state: AppState) -> Router {
    let shared_state = Arc::new(state);

    Router::new()
        .route("/ws", get(ws::ws_handler))
        .route("/api/sessions", get(ws::list_sessions_api))
        .route("/api/scenarios", get(ws::list_scenarios_api))
        .route("/api/health", get(ws::health_check))
        .with_state(shared_state)
}
