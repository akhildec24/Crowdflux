# CrowdFlux: Real-Time Multiplayer Crowd and Emergency Simulation

An interactive browser-based simulation for modelling how people move through festivals, transport hubs, public spaces and emergency situations. Built with a Rust authoritative simulation server and a React/Three.js/WebGL frontend.

## Architecture

- **Rust server** (`/server`): Authoritative simulation with ECS-style agents, A* pathfinding on a navigation graph, density grid computation, deterministic RNG, WebSocket communication via Axum, and scenario management.
- **React/Three.js frontend** (`/src`): Instanced GPU-based agent rendering with GLSL shaders, six camera modes, seven analytical overlay modes, full operational HUD, keyboard shortcuts, accessibility options, procedural audio, and automated screenshot interface.

## Prerequisites

- **Rust** (stable, 1.70+)
- **Node.js** 18+
- **npm**

## Quick Start

### Option 1: Run both server and frontend together

```bash
npm install
npm run dev:all
```

This starts the Rust server on port 3001 and the Vite dev server on port 5173.

### Option 2: Run separately

Terminal 1 — Rust server:
```bash
cd server
cargo run
```

Terminal 2 — Frontend:
```bash
npm install
npm run dev
```

Open http://localhost:5173

### Offline mode

If the Rust server is not running, the frontend automatically falls back to a local visual simulation mode with reduced functionality.

## Features

### Simulation
- Up to 50,000 autonomous agents with individual state (position, destination, speed, stress, group, mobility, evacuation status)
- A* pathfinding on a navigation graph with dynamic route recalculation
- Density-based speed reduction and crowd stress propagation
- Queue formation, group cohesion, and evacuation behaviour
- Deterministic simulation with configurable random seed

### Visualisation
- **Instanced GPU rendering** — agents rendered as GPU points with custom GLSL shaders, not individual scene objects
- **7 overlay modes**: Normal, Density Heatmap, Movement Flow, Exit Pressure, Risk, Accessibility, Emergency Access
- **6 agent colour modes**: By destination, group, stress, evacuation status, mobility, route assignment
- **4 quality profiles**: Low (5K), Medium (15K), High (30K), Ultra (50K)

### Camera
- Cinematic orbit, Tactical (top-down), Free, Follow, Ground-level, Incident-focus
- Smooth interpolated transitions with eased movement
- Camera bookmarks (save/recall named positions)

### Operational Tools
- Barrier placement and removal
- Entrance/exit open/close controls
- Incident creation (medical, fire, suspicious package, crowd surge, transport failure)
- Site-wide announcements and evacuation control
- Security and medical team deployment
- Weather intensity control
- Transport capacity adjustment
- Population target control

### HUD
- Top navigation bar with scenario name, connection status, role, operator count, simulation time
- Left icon-based tool rail with tooltips
- Right contextual parameter console with effect previews
- Bottom timeline with play/pause, speed control, incident/action markers
- Collapsible performance panel (TPS, FPS, latency, agent count, snapshot size, path recalcs)
- Overlay legends with colour key
- Incident alert banners
- Operator presence indicators

### Multiplayer
- WebSocket-based real-time communication
- 5 operator roles: Event Controller, Security Coordinator, Transport Coordinator, Medical Coordinator, Observer
- Server-side action validation and audit log
- Shared simulation state across all connected operators

### Scenarios
1. **Festival Arrival** — Visitors arrive gradually as gates open
2. **Headline Crowd Surge** — Crowd density peaks as headline performance approaches
3. **Severe Weather** — Heavy rain and transport disruption
4. **Full Evacuation** — Major incident triggers full-site evacuation

### Reports
End-of-scenario reports include: max crowd density, average/longest queue time, exit clearance time, blocked routes, critical density events, emergency response time, average walking distance, rerouted visitors, operator action history, accessibility issues, and incident timeline.

### Accessibility
- Full keyboard navigation
- Reduced-motion mode
- High-contrast mode
- Colour-blind-friendly palette
- Screen-reader alerts for critical incidents
- Scalable interface text
- No mouse-hover-only controls

### Automated Screenshot Interface
URL parameters for automated capture:
```
?capture=true&scenario=festival&time=18:30&camera=tactical&overlay=density&hud=false
```

Readiness signal: `window.__CROWDFLUX_CAPTURE_READY__` is set to `true` only when the scenario is loaded, simulation has reached the requested time, camera movement is complete, and at least two frames have rendered.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| 1 | Normal view |
| 2 | Density heatmap |
| 3 | Movement flow |
| 4 | Risk view |
| 5 | Emergency access view |
| T | Tactical camera |
| F | Free camera |
| G | Ground camera |
| C | Cinematic camera |
| E | Focus nearest incident |
| B | Barrier tool |
| X | Exit tool |
| I | Incident tool |
| A | Announcement tool |
| R | Reset camera |
| M | Mute / Unmute |
| H | Toggle interface |
| P | Performance panel |
| Esc | Cancel active tool |
| Shift+S | Capture screenshot |
| ? | Keyboard reference |

## Project Structure

```
crowdflux/
├── server/                    # Rust simulation server
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs            # Entry point
│       ├── protocol.rs        # WebSocket message types
│       ├── server/
│       │   ├── mod.rs         # Router and state
│       │   └── ws.rs          # WebSocket handler
│       └── sim/
│           ├── mod.rs
│           ├── agent.rs       # Agent state and behaviour
│           ├── nav_graph.rs   # Navigation graph with A* pathfinding
│           ├── density.rs     # Density grid computation
│           ├── world.rs       # Simulation world and tick loop
│           ├── scenario.rs    # Scenario definitions and festival graph
│           └── rng.rs         # Deterministic RNG
├── src/                       # Frontend application
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Main app component
│   ├── store/useStore.ts      # Zustand state store
│   ├── net/
│   │   ├── types.ts           # TypeScript protocol types
│   │   └── SimulationClient.ts # WebSocket client
│   ├── engine/
│   │   ├── CrowdFluxEngine.ts # Main Three.js engine
│   │   ├── EnvironmentBuilder.ts # Festival environment
│   │   ├── AgentRenderer.ts   # Instanced GPU agent rendering
│   │   ├── CameraController.ts # Camera modes and transitions
│   │   └── OverlayRenderer.ts # GLSL overlay shaders
│   ├── components/            # React HUD components
│   ├── hooks/                 # Keyboard shortcuts, capture mode
│   ├── audio/AudioEngine.ts   # Procedural Web Audio
│   └── styles/global.css      # Application styles
├── SPECIFICATION.md           # Full project specification
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Technology Stack

### Server (Rust)
- Tokio — async runtime
- Axum — HTTP and WebSocket
- Serde — serialisation
- Rayon — parallel CPU calculations
- Rand — deterministic RNG
- Tracing — structured logging

### Frontend
- React 18 + TypeScript
- Vite 5
- Three.js (WebGL)
- Zustand — state management
- Web Audio API — procedural audio

## Build for Production

```bash
# Build frontend
npm run build

# Build Rust server (release)
cd server && cargo build --release
```

Frontend output is in `dist/`. Rust binary is in `server/target/release/crowdflux-server`.

## Licence

This project is built as a technical portfolio demonstration.
