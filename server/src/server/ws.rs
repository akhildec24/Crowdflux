use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::Json,
};
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

use crate::protocol::*;
use crate::server::{AppState, Operator, Session};
use crate::sim::scenario::scenarios;
use crate::sim::world::SimulationWorld;

#[derive(serde::Deserialize)]
pub struct WsQuery {
    pub session_id: Option<String>,
    pub role: Option<String>,
    pub name: Option<String>,
    pub scenario: Option<String>,
    pub seed: Option<u64>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<Arc<AppState>>,
) -> impl axum::response::IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, query, state))
}

async fn handle_ws(socket: WebSocket, query: WsQuery, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();

    // Create or join session
    let session_id = if let Some(sid) = &query.session_id {
        if state.sessions.contains_key(sid) {
            sid.clone()
        } else {
            // Create new session with the given ID
            let scenario = query.scenario.as_deref().unwrap_or("Festival Arrival");
            let seed = query.seed.unwrap_or(42);
            let world = SimulationWorld::new(scenario, seed);
            let session = Arc::new(RwLock::new(Session {
                id: sid.clone(),
                world,
                operators: Vec::new(),
                action_history: Vec::new(),
            }));
            state.sessions.insert(sid.clone(), session);
            sid.clone()
        }
    } else {
        // Create a new session
        let sid = format!("session_{}", uuid::Uuid::new_v4());
        let scenario = query.scenario.as_deref().unwrap_or("Festival Arrival");
        let seed = query.seed.unwrap_or(42);
        let world = SimulationWorld::new(scenario, seed);
        let session = Arc::new(RwLock::new(Session {
            id: sid.clone(),
            world,
            operators: Vec::new(),
            action_history: Vec::new(),
        }));
        state.sessions.insert(sid.clone(), session);
        sid
    };

    let role = query.role.unwrap_or_else(|| "observer".to_string());
    let name = query.name.unwrap_or_else(|| "Operator".to_string());

    // Add operator to session
    {
        let session = state.sessions.get(&session_id).unwrap();
        let mut s = session.write().await;
        s.operators.push(Operator {
            name: name.clone(),
            role: role.clone(),
        });
    }

    // Send session created/joined message
    let operator_count = {
        let session = state.sessions.get(&session_id).unwrap();
        let s = session.read().await;
        s.operators.len() as u32
    };

    let join_msg = ServerMessage::Joined {
        session_id: session_id.clone(),
        role: role.clone(),
        operators: operator_count,
    };
    if sender
        .send(Message::Text(serde_json::to_string(&join_msg).unwrap()))
        .await
        .is_err()
    {
        return;
    }

    // Start simulation tick loop in a separate task
    let session_arc = state.sessions.get(&session_id).unwrap().clone();
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    // Tick loop
    let tick_session = session_arc.clone();
    let tick_tx = tx.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(50));
        let mut snapshot_counter = 0u32;
        loop {
            interval.tick().await;
            {
                let mut s = tick_session.write().await;
                s.world.tick_sim(0.05);
            }

            // Send snapshot every 5 ticks (10 Hz)
            snapshot_counter += 1;
            if snapshot_counter >= 5 {
                snapshot_counter = 0;
                let snapshot = {
                    let s = tick_session.read().await;
                    s.world.build_snapshot()
                };
                let snapshot_json = serde_json::to_string(&ServerMessage::Snapshot(snapshot)).unwrap();
                if tick_tx.send(snapshot_json).await.is_err() {
                    break;
                }

                // Send metrics
                let snapshot_size = {
                    let s = tick_session.read().await;
                    let snap = s.world.build_snapshot();
                    serde_json::to_string(&snap).unwrap().len()
                };
                let metrics = {
                    let s = tick_session.read().await;
                    s.world.build_metrics(snapshot_size)
                };
                let metrics_json = serde_json::to_string(&ServerMessage::Metrics(metrics)).unwrap();
                let _ = tick_tx.send(metrics_json).await;
            }
        }
    });

    // Forward messages to WebSocket
    let send_tx = tx.clone();
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Receive messages from WebSocket
    let recv_session = session_arc.clone();
    let recv_state = state.clone();
    let recv_name = name.clone();
    let recv_role = role.clone();
    let recv_session_id = session_id.clone();

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                    handle_client_message(
                        client_msg,
                        &recv_session,
                        &recv_name,
                        &recv_role,
                        &send_tx,
                    )
                    .await;
                } else {
                    eprintln!("Failed to parse client message: {}", &text[..text.len().min(200)]);
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Remove operator from session
    {
        let session = recv_state.sessions.get(&recv_session_id);
        if let Some(session) = session {
            let mut s = session.write().await;
            s.operators.retain(|o| o.name != recv_name);
        }
    }

    send_task.abort();
}

async fn handle_client_message(
    msg: ClientMessage,
    session: &Arc<RwLock<Session>>,
    user: &str,
    role: &str,
    tx: &tokio::sync::mpsc::Sender<String>,
) {
    match msg {
        ClientMessage::Ping => {
            let _ = tx.send(serde_json::to_string(&ServerMessage::Pong).unwrap()).await;
        }
        ClientMessage::SetSpeed { speed } => {
            let mut s = session.write().await;
            s.world.set_speed(speed);
            s.world.log_action(user, role, "set_speed", &format!("Speed set to {:.2}", speed));
        }
        ClientMessage::Pause => {
            let mut s = session.write().await;
            s.world.pause();
            s.world.log_action(user, role, "pause", "Simulation paused");
        }
        ClientMessage::Resume => {
            let mut s = session.write().await;
            s.world.resume();
            s.world.log_action(user, role, "resume", "Simulation resumed");
        }
        ClientMessage::RequestSnapshot => {
            let s = session.read().await;
            let snapshot = s.world.build_snapshot();
            let _ = tx.send(serde_json::to_string(&ServerMessage::Snapshot(snapshot)).unwrap()).await;
        }
        ClientMessage::RequestReport => {
            let s = session.read().await;
            let report = s.world.build_report();
            let _ = tx.send(serde_json::to_string(&ServerMessage::Report(report)).unwrap()).await;
        }
        ClientMessage::SetWorld { world } => {
            let mut s = session.write().await;
            println!("SetWorld received: {} objects, target_pop={}, seed={}", world.objects.len(), world.target_population, world.seed);
            s.world.rebuild_from_world(&world);
            s.world.log_action(user, role, "set_world", &format!("World rebuilt with {} objects, target pop {}", world.objects.len(), world.target_population));
        }
        ClientMessage::Command(cmd) => {
            let mut s = session.write().await;
            match cmd {
                OperationCommand::ToggleEntrance { id, open } => {
                    s.world.toggle_entrance(&id, open);
                    s.world.log_action(user, role, "toggle_entrance", &format!("{} {}", id, if open { "opened" } else { "closed" }));
                }
                OperationCommand::ToggleExit { id, open } => {
                    s.world.toggle_exit(&id, open);
                    s.world.log_action(user, role, "toggle_exit", &format!("{} {}", id, if open { "opened" } else { "closed" }));
                }
                OperationCommand::PlaceBarrier { x, z, rotation, length } => {
                    s.world.place_barrier(x, z, rotation, length);
                    s.world.log_action(user, role, "place_barrier", &format!("at ({:.1}, {:.1})", x, z));
                }
                OperationCommand::RemoveBarrier { id } => {
                    s.world.remove_barrier(&id);
                    s.world.log_action(user, role, "remove_barrier", &id);
                }
                OperationCommand::CreateIncident { x, z, kind, severity } => {
                    s.world.create_incident(x, z, &kind, severity);
                    s.world.log_action(user, role, "create_incident", &format!("{} at ({:.1}, {:.1})", kind, x, z));
                }
                OperationCommand::ResolveIncident { id } => {
                    let id_str = id.clone();
                    s.world.resolve_incident(&id);
                    s.world.log_action(user, role, "resolve_incident", &id_str);
                }
                OperationCommand::BroadcastAnnouncement { message, target_area } => {
                    s.world.log_action(user, role, "announcement", &message);
                }
                OperationCommand::StartEvacuation => {
                    s.world.start_evacuation();
                    s.world.log_action(user, role, "start_evacuation", "Full evacuation initiated");
                }
                OperationCommand::StopEvacuation => {
                    s.world.stop_evacuation();
                    s.world.log_action(user, role, "stop_evacuation", "Evacuation stopped");
                }
                OperationCommand::SetWeather { intensity } => {
                    s.world.set_weather(intensity);
                    s.world.log_action(user, role, "set_weather", &format!("Intensity: {:.2}", intensity));
                }
                OperationCommand::SetTransportCapacity { id, capacity } => {
                    s.world.set_transport_capacity(&id, capacity);
                    s.world.log_action(user, role, "set_transport_capacity", &format!("{}: {}", id, capacity));
                }
                OperationCommand::SetAttractionPopularity { id, popularity } => {
                    let id_str = id.clone();
                    s.world.attraction_popularities.insert(id, popularity);
                    s.world.log_action(user, role, "set_attraction_popularity", &format!("{}: {:.2}", id_str, popularity));
                }
                OperationCommand::DeploySecurity { x, z, count } => {
                    s.world.log_action(user, role, "deploy_security", &format!("{} units at ({:.1}, {:.1})", count, x, z));
                }
                OperationCommand::DeployMedical { x, z, count } => {
                    s.world.log_action(user, role, "deploy_medical", &format!("{} units at ({:.1}, {:.1})", count, x, z));
                }
                OperationCommand::SetPopulation { target } => {
                    s.world.target_population = target;
                    s.world.log_action(user, role, "set_population", &format!("Target: {}", target));
                }
            }

            // Send action log
            if let Some(last) = s.world.action_log.last() {
                let _ = tx.send(serde_json::to_string(&ServerMessage::ActionLog(last.clone())).unwrap()).await;
            }
        }
        _ => {}
    }
}

#[derive(Serialize)]
pub struct SessionListResponse {
    pub sessions: Vec<SessionInfoResponse>,
}

#[derive(Serialize)]
pub struct SessionInfoResponse {
    pub id: String,
    pub scenario: String,
    pub operators: u32,
    pub agent_count: u32,
    pub sim_time: f32,
}

pub async fn list_sessions_api(State(state): State<Arc<AppState>>) -> Json<SessionListResponse> {
    let mut sessions = Vec::new();
    for entry in state.sessions.iter() {
        let s = entry.value().read().await;
        sessions.push(SessionInfoResponse {
            id: s.world.scenario_name.clone(),
            scenario: s.world.scenario_name.clone(),
            operators: s.operators.len() as u32,
            agent_count: s.world.agents.len() as u32,
            sim_time: s.world.sim_time,
        });
    }
    Json(SessionListResponse { sessions })
}

#[derive(Serialize)]
pub struct ScenariosResponse {
    pub scenarios: Vec<ScenarioInfo>,
}

#[derive(Serialize)]
pub struct ScenarioInfo {
    pub name: String,
    pub description: String,
    pub target_population: u32,
}

pub async fn list_scenarios_api() -> Json<ScenariosResponse> {
    let scenarios: Vec<ScenarioInfo> = scenarios()
        .iter()
        .map(|s| ScenarioInfo {
            name: s.name.to_string(),
            description: s.description.to_string(),
            target_population: s.target_population,
        })
        .collect();
    Json(ScenariosResponse { scenarios })
}

pub async fn health_check() -> &'static str {
    "OK"
}
