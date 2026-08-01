# CrowdFlux: Real-Time Multiplayer Crowd and Emergency Simulation

## Full title
CrowdFlux: Real-Time Multiplayer Crowd and Emergency Simulation

## Project concept
CrowdFlux is an interactive browser-based simulation for modelling how people move through festivals, theatres, transport hubs, public spaces and emergency situations.

Thousands of autonomous people move through a live 3D environment. Users can change entrances, exits, barriers, attractions, queue systems, road closures and emergency routes while the simulation is running.

Multiple users can join the same simulation and take different operational roles, such as event controller, security manager, transport coordinator or observer.

The project demonstrates why Rust is the correct technology for:
- Large-scale agent simulation
- Safe parallel processing
- Real-time multiplayer networking
- Pathfinding and route recalculation
- High-frequency state updates
- Deterministic simulation
- Low memory usage
- Reliable long-running server processes

Three.js, WebGL and GLSL are used for rendering, not authoritative simulation.

## Core experience
The main screen presents a cinematic 3D model of a fictional festival, town centre or transport interchange.

Thousands of simulated visitors enter, move between attractions, form queues, react to congestion and leave through exits.

The user can pause, change speed or modify the environment while the simulation runs.

Example actions:
- Opening or closing an entrance
- Moving a crowd barrier
- Adding a temporary stage
- Creating a food or ticket queue
- Closing a road
- Triggering heavy rain
- Creating a medical incident
- Introducing a suspicious package
- Blocking an emergency exit
- Sending a security team to a location
- Starting an evacuation
- Redirecting visitors through announcements
- Changing public transport capacity

Effects must emerge from the simulation, not pre-scripted animations.

## Main demonstration scenario
Fictional outdoor festival with:
- One main stage
- One secondary stage
- Food and drink areas
- Toilets
- Medical facilities
- Ticket gates
- Security checkpoints
- Public transport stops
- Parking areas
- Emergency exits
- Temporary barriers
- Restricted backstage areas

Visitors enter gradually. Crowd density increases as the main performance approaches.

Operator monitors queues, congestion, emergency access and exit capacity.

Supports normal operation, poor weather, transport disruption, medical emergencies and full evacuation.

## User roles
### Event controller
View complete environment, trigger scenarios, change simulation speed, issue site-wide instructions.

### Security coordinator
Deploy staff, close areas, redirect movement, respond to incidents.

### Transport coordinator
Change bus, rail, parking and drop-off capacity.

### Medical coordinator
Position medical teams, respond to casualties, inspect emergency access routes.

### Observer
View simulation, cannot change operational settings.

## Technical architecture

### Rust simulation server
Authoritative simulation. Responsibilities:
- Agent state and behaviour
- Entity Component System
- Pathfinding
- Navigation graphs
- Crowd density calculations
- Collision avoidance
- Queue formation
- Incident handling
- Scenario scripting
- Multiplayer state management
- Simulation snapshots
- Replay generation
- Server persistence
- WebSocket communication
- Performance metrics

Suggested Rust technologies:
- Tokio for async runtime
- Axum for HTTP and WebSocket
- Bevy ECS or custom lightweight ECS
- Rayon for parallel CPU calculations
- Serde for serialisation
- tracing for structured logs
- SQLx with PostgreSQL for persistence
- Redis only if later required

### Front-end application
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Zustand for local state
- WebSockets for live data
- Web Workers for non-authoritative processing

### Rendering strategy
5,000–50,000 visible agents. Use:
- InstancedMesh rendering
- GPU-friendly agent attributes
- Level of detail
- Frustum culling
- Distance-based animation reduction
- Simplified geometry at distance
- Batched state updates
- Interpolation between server snapshots
- GLSL shaders for density and risk visualisation

## Agent behaviour
Properties: position, destination, walking speed, mobility profile, familiarity, group membership, stress level, patience, route preference, current queue, incident awareness, evacuation state, assistance requirements.

Behaviours: selecting destinations, following routes, avoiding obstacles, slowing in dense areas, joining queues, staying with groups, responding to announcements, avoiding danger, following others when uncertain, recalculating routes, seeking exits during evacuation, helping slower group members.

## Crowd simulation model
- Navigation mesh or graph-based routing
- Flow fields for large-scale movement
- Local steering for obstacle avoidance
- Density-based speed reduction
- Queue nodes for controlled service areas
- Group cohesion rules
- Risk and stress propagation
- Exit capacity constraints

Deterministic with same random seed and scenario configuration.

## Multiplayer system
Each scenario runs as authoritative server session. Users see same agents, incidents, timeline, environmental changes, other operators' actions, presence indicators, operator cursors.

Operator actions recorded with: user, role, action type, simulation timestamp, affected object, previous value, new value.

Conflicts resolved by permissions and server ordering.

## Visual direction
Professional operational simulator. Inspired by architectural visualisation, transport control systems, scientific data visualisation, emergency coordination software, cinematic miniature environments.

### Colour language
- Neutral tones: ordinary structures
- Blue: information and normal flow
- Amber: developing congestion
- Orange: significant risk
- Red: incidents and critical density
- Green: open emergency routes and safe exits
- Purple: multiplayer operator markers

Colour must never be the only method for important state.

## Agent visualisation
- Tactical distance: low-poly human figures
- Medium distance: simplified capsules or directional markers
- Large distance: animated density particles

Agent colours represent: destination, group, stress level, evacuation status, mobility category, route assignment.

Operator can change active visualisation mode.

## Density visualisation modes
1. Normal view
2. Density heatmap
3. Movement flow
4. Exit pressure
5. Risk view
6. Accessibility view
7. Emergency access view

## Main interface layout
### Top navigation bar
Logo, scenario name, connection status, operator role, connected operators count, simulation time, scenario state, settings, help.

### Left tool rail
Selection, barriers, entrances/exits, attractions, emergency services, incidents, announcements, measurement, heatmaps, camera bookmarks. Compact, icon-led, tooltips.

### Right parameter console
Contextual controls: barrier direction, entrance capacity, exit capacity, queue speed, attraction popularity, incident severity, announcement reach, transport arrival rate, weather intensity, agent population, random seed. Show likely operational effect before applying.

### Bottom simulation timeline
Play/pause, simulation speed, current time, incident markers, operator action markers, scenario phase markers, replay controls, before/after comparison.

Speeds: Paused, 0.25x, 0.5x, 1x, 2x, 5x, 10x, Maximum.

### Performance panel
Total agents, visible agents, ticks per second, server calculation time, render FPS, network latency, snapshot size, memory usage, active routes, queue count, path recalculations per second.

## Camera system
- Cinematic orbit (landing/inactive)
- Tactical (top-down)
- Free (move freely)
- Follow (track selected agent)
- Ground (pedestrian height)
- Incident (auto-frame incident)
- Camera bookmarks (save/recall named positions)

Smooth position and target interpolation. No abrupt jumps unless emergency jump command.

## Sound and soundtrack
Layered procedural/loop-based audio: crowd ambience, stage sound, traffic, announcements, rain, emergency vehicles, alarms, low-frequency tension during danger.

Responds to simulation conditions. Independent controls: master, music, environment, announcements, alerts.

Audio disabled until user interaction.

## Quality profiles
### Low
Up to 5,000 agents, simplified geometry, reduced shadows, reduced interpolation, no post-processing, basic heatmaps.

### Medium
Up to 15,000 agents, moderate shadows, standard animation, selected overlays, moderate detail.

### High
Up to 30,000 agents, improved lighting, better animation, full overlays, limited post-processing, higher detail.

### Ultra
Up to 50,000 agents, maximum detail, high-quality shadows, advanced shaders, full post-processing, high-res screenshots, extended trails.

Auto-recommend profile after performance test.

## Keyboard shortcuts
- Space: play/pause
- 1: normal view
- 2: density heatmap
- 3: movement flow
- 4: risk view
- 5: emergency access view
- T: tactical camera
- F: free camera
- G: ground camera
- C: cinematic camera
- E: focus nearest incident
- B: barrier tool
- X: exit tool
- I: incident tool
- A: announcement tool
- R: reset camera
- M: mute/unmute
- H: toggle interface
- P: performance panel
- Escape: cancel active tool
- Shift+S: screenshot
- ?: keyboard reference

## Scenario system
Scenario contains: environment definition, agent population, entry schedule, attractions/destinations, route network, service capacities, weather, transport schedule, scheduled incidents, operator roles, success/failure conditions, random seed.

Four demonstration scenarios:
1. Festival opening and arrival
2. Headline performance crowd surge
3. Severe weather and transport disruption
4. Full-site evacuation

## Scenario outcomes
Report: maximum crowd density, average queue time, longest queue time, exit clearance time, blocked routes count, critical-density events, emergency response time, average walking distance, rerouted visitors, operator actions, accessibility issues, incident timeline.

Compare two runs of same scenario.

## Replay system
Replay includes: agent movement, incidents, environment changes, operator actions, announcements, camera bookmarks, key metrics.

Scrub backwards and forwards without rerunning simulation.

## Automated screenshot interface
URL parameters: `?capture=true&scenario=festival&time=18:30&camera=tactical&overlay=density&hud=false`

Readiness: `window.__CROWDFLUX_CAPTURE_READY__` set to true only when scenario loaded, simulation at requested time, camera movement complete, textures loaded, overlay stable, at least two frames rendered.

Supports named camera bookmarks and predefined demonstration states. Reproducible with same scenario, time and seed.

## Accessibility requirements
- Full keyboard navigation
- Clear visible focus states
- Reduced-motion option
- High-contrast mode
- Colour-blind-friendly palette
- Text alternatives for visual alerts
- Screen-reader announcements for critical incidents
- Scalable interface text
- No mouse-hover-only controls
- Touch-friendly control sizes

## Security requirements
- Rust server authoritative
- Validate all operator commands
- Enforce role permissions server-side
- Rate-limit commands
- Prevent direct client state changes
- Validate scenario uploads
- No uploaded code execution
- Secure session management
- Audit history of operator actions
- Reject malformed WebSocket messages
- Limit maximum scenario complexity
- Prevent unlimited session creation

## Development phases
### Phase 1: Product definition
Requirements, user journeys, scenario data structure, role model, wireframes, visual reference, performance targets, browser support.

### Phase 2: Rust simulation prototype
Headless Rust: 10,000 agents, navigation graph, blocked route avoidance, density measurement, faster than real time, deterministic.

### Phase 3: Basic Three.js environment
Festival site model, ground, paths, stages, entrances, exits, barriers, lighting, tactical and free cameras.

### Phase 4: Live server connection
WebSocket session creation/joining, snapshots, client interpolation, reconnection, latency display, simulation controls.

### Phase 5: Large-scale agent rendering
Instanced rendering, distance-based detail, colour modes, visibility culling, interpolation, performance counters.

### Phase 6: Operational tools
Barrier placement, entrance/exit controls, queue controls, announcements, incidents, emergency deployment, undo, server-side validation.

### Phase 7: Analytical overlays
Density heatmap, flow vectors, exit pressure, risk view, accessibility view, emergency access view.

### Phase 8: Incidents and evacuation
Medical incident, blocked exit, suspicious package, severe weather, transport failure, fire/hazard, controlled evacuation, full evacuation.

### Phase 9: Multiplayer operations
Operator roles, presence, shared selections, action history, role permissions, operational messages.

### Phase 10: Replay and comparison
Simulation recording, timeline scrubbing, event markers, run comparison, outcome report, exportable summary.

### Phase 11: Audio and cinematic presentation
Environmental sound, announcements, alerts, reactive soundtrack, cinematic camera, incident framing, camera bookmarks.

### Phase 12: Quality profiles and optimisation
Optimise simulation loops, serialisation, WebSocket traffic, rendering, shaders, memory, loading, replay storage.

### Phase 13: Automated demonstration system
URL-controlled loading, deterministic camera states, screenshot readiness, portfolio sequence, performance test, benchmark scenarios.

### Phase 14: Final polish
Responsive layouts, mobile observer mode, accessibility testing, empty/loading/error states, onboarding, keyboard reference, documentation, deployment.

## Implementation priorities
1. Correct authoritative simulation
2. Deterministic and testable behaviour
3. Rust performance and concurrency
4. Stable multiplayer synchronisation
5. Clear scientific visualisation
6. Smooth rendering
7. Operational usability
8. Cinematic presentation
9. Accessibility
10. Visual polish

## Language
UK English throughout the interface.
