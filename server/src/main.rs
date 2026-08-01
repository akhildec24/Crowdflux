use tracing_subscriber;

mod sim;
mod server;
mod protocol;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let app_state = server::AppState::new();
    let app = server::create_router(app_state);

    let addr = "0.0.0.0:3001";
    tracing::info!("CrowdFlux simulation server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
