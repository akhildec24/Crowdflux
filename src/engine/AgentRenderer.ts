import * as THREE from 'three';
import type { AgentData, AgentColourMode, QualityProfile } from '../net/types';

const MAX_AGENTS = 50000;

const agentVertexShader = `
  attribute float aStress;
  attribute float aSpeed;
  attribute vec3 aColour;
  attribute float aScale;
  varying vec3 vColour;
  varying float vStress;
  varying float vFogDepth;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColour = aColour;
    vStress = aStress;
    vFogDepth = -mvPosition.z;

    vec3 pos = position;
    // Simple bobbing animation based on speed and time
    float phase = uTime * 3.0 + float(gl_InstanceID) * 0.5;
    pos.y += sin(phase) * 0.15 * aSpeed * aScale;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vFogDepth = -mvPosition.z;
    gl_PointSize = aScale * 8.0 * uPixelRatio * (300.0 / vFogDepth);
  }
`;

const agentFragmentShader = `
  varying vec3 vColour;
  varying float vStress;
  varying float vFogDepth;
  uniform vec3 uFogColour;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.35, dist);
    // Highlight stress with slight red shift
    vec3 colour = mix(vColour, vec3(1.0, 0.3, 0.2), vStress * 0.4);

    // Fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    colour = mix(colour, uFogColour, fogFactor * 0.6);

    gl_FragColor = vec4(colour, alpha);
  }
`;

const COLOUR_PALETTE = {
  destination: [
    new THREE.Color(0x4a7a9a), // stage — muted blue
    new THREE.Color(0xe5c100), // food — yellow
    new THREE.Color(0x6b7a4a), // toilet — olive
    new THREE.Color(0xe63946), // medical — signal red
    new THREE.Color(0x8a8a8a), // transport — grey
    new THREE.Color(0x3a3a3a), // exit — charcoal
  ],
  group: [
    new THREE.Color(0x4a7a9a), new THREE.Color(0xe5c100), new THREE.Color(0x6b7a4a),
    new THREE.Color(0xe63946), new THREE.Color(0x8a8a8a), new THREE.Color(0x3a8a5a),
    new THREE.Color(0xca8a4a), new THREE.Color(0x4a4a8a),
  ],
  stress: [
    new THREE.Color(0x4a7a9a), new THREE.Color(0xe5c100), new THREE.Color(0xe63946),
  ],
  evacuation: [
    new THREE.Color(0xe63946), new THREE.Color(0xe5c100), new THREE.Color(0x4a7a9a),
  ],
  mobility: [
    new THREE.Color(0x4a7a9a), new THREE.Color(0xe5c100), new THREE.Color(0xe63946),
  ],
  route: [
    new THREE.Color(0x4a7a9a), new THREE.Color(0x3a3a3a),
  ],
};

export class AgentRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private colours: Float32Array;
  private stress: Float32Array;
  private speed: Float32Array;
  private scale: Float32Array;
  private maxAgents: number;
  private currentColourMode: AgentColourMode = 'destination';
  private qualityProfile: QualityProfile = 'medium';

  constructor(maxAgents?: number) {
    this.maxAgents = maxAgents ?? MAX_AGENTS;

    const profileLimits: Record<QualityProfile, number> = {
      low: 5000,
      medium: 15000,
      high: 30000,
      ultra: 50000,
    };
    this.maxAgents = Math.min(this.maxAgents, profileLimits[this.qualityProfile]);

    this.positions = new Float32Array(this.maxAgents * 3);
    this.colours = new Float32Array(this.maxAgents * 3);
    this.stress = new Float32Array(this.maxAgents);
    this.speed = new Float32Array(this.maxAgents);
    this.scale = new Float32Array(this.maxAgents);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColour', new THREE.BufferAttribute(this.colours, 3));
    this.geometry.setAttribute('aStress', new THREE.BufferAttribute(this.stress, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(this.speed, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scale, 1));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: agentVertexShader,
      fragmentShader: agentFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uFogColour: { value: new THREE.Color(0x000000) },
        uFogNear: { value: 100 },
        uFogFar: { value: 350 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.name = 'agents';
  }

  getObject(): THREE.Points {
    return this.points;
  }

  setColourMode(mode: AgentColourMode) {
    this.currentColourMode = mode;
  }

  setQualityProfile(profile: QualityProfile) {
    this.qualityProfile = profile;
    const limits: Record<QualityProfile, number> = {
      low: 5000,
      medium: 15000,
      high: 30000,
      ultra: 50000,
    };
    this.maxAgents = limits[profile];
  }

  getColourForAgent(agent: AgentData): THREE.Color {
    const mode = this.currentColourMode;

    switch (mode) {
      case 'destination': {
        const destType = agent.dest % 6;
        return COLOUR_PALETTE.destination[destType] ?? COLOUR_PALETTE.destination[0];
      }
      case 'group':
        return COLOUR_PALETTE.group[agent.group % 8] ?? COLOUR_PALETTE.group[0];
      case 'stress': {
        const idx = agent.stress < 0.33 ? 0 : agent.stress < 0.66 ? 1 : 2;
        return COLOUR_PALETTE.stress[idx];
      }
      case 'evacuation': {
        if (agent.state === 5 || agent.state === 6) return COLOUR_PALETTE.evacuation[0];
        if (agent.state === 4) return COLOUR_PALETTE.evacuation[1];
        return COLOUR_PALETTE.evacuation[2];
      }
      case 'mobility': {
        const idx = agent.speed > 1.3 ? 0 : agent.speed > 0.9 ? 1 : 2;
        return COLOUR_PALETTE.mobility[idx];
      }
      case 'route':
        return agent.state === 5 ? COLOUR_PALETTE.route[0] : COLOUR_PALETTE.route[1];
      default:
        return COLOUR_PALETTE.destination[0];
    }
  }

  update(agents: AgentData[], time: number, interpolationAlpha: number, prevAgents?: Map<number, AgentData>) {
    const count = Math.min(agents.length, this.maxAgents);
    this.geometry.setDrawRange(0, count);

    for (let i = 0; i < count; i++) {
      const agent = agents[i];
      const i3 = i * 3;

      // Interpolate position if we have previous data
      let x = agent.x;
      let z = agent.z;

      if (prevAgents && interpolationAlpha < 1.0) {
        const prev = prevAgents.get(agent.id);
        if (prev) {
          x = prev.x + (agent.x - prev.x) * interpolationAlpha;
          z = prev.z + (agent.z - prev.z) * interpolationAlpha;
        }
      }

      this.positions[i3] = x;
      this.positions[i3 + 1] = 0.5; // Slightly above ground
      this.positions[i3 + 2] = z;

      const colour = this.getColourForAgent(agent);
      this.colours[i3] = colour.r;
      this.colours[i3 + 1] = colour.g;
      this.colours[i3 + 2] = colour.b;

      this.stress[i] = agent.stress;
      this.speed[i] = agent.speed;
      this.scale[i] = 1.0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColour.needsUpdate = true;
    this.geometry.attributes.aStress.needsUpdate = true;
    this.geometry.attributes.aSpeed.needsUpdate = true;
    this.geometry.attributes.aScale.needsUpdate = true;

    this.material.uniforms.uTime.value = time;
  }

  getVisibleCount(): number {
    return this.geometry.drawRange.count;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
