import * as THREE from 'three';
import type { OverlayMode, Snapshot } from '../net/types';

const overlayVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const densityFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uDensity;
  uniform float uMaxDensity;
  uniform vec3 uColourLow;
  uniform vec3 uColourMed;
  uniform vec3 uColourHigh;
  uniform vec3 uColourCritical;

  void main() {
    float d = texture2D(uDensity, vUv).r;
    float norm = d / max(uMaxDensity, 1.0);
    
    vec3 colour;
    if (norm < 0.25) {
      colour = mix(uColourLow, uColourMed, norm * 4.0);
    } else if (norm < 0.5) {
      colour = mix(uColourMed, uColourHigh, (norm - 0.25) * 4.0);
    } else if (norm < 0.75) {
      colour = mix(uColourHigh, uColourCritical, (norm - 0.5) * 4.0);
    } else {
      colour = uColourCritical;
    }
    
    float alpha = norm > 0.05 ? 0.6 : 0.0;
    gl_FragColor = vec4(colour, alpha);
  }
`;

const flowFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uFlowX;
  uniform sampler2D uFlowZ;
  uniform float uScale;

  void main() {
    float fx = texture2D(uFlowX, vUv).r;
    float fz = texture2D(uFlowZ, vUv).r;
    float mag = length(vec2(fx, fz)) * uScale;
    
    vec3 colour = vec3(0.3, 0.6, 1.0) * mag;
    float alpha = mag > 0.01 ? min(mag * 0.5, 0.5) : 0.0;
    gl_FragColor = vec4(colour, alpha);
  }
`;

const riskFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uDensity;
  uniform sampler2D uStress;
  uniform float uMaxDensity;

  void main() {
    float d = texture2D(uDensity, vUv).r / max(uMaxDensity, 1.0);
    float s = texture2D(uStress, vUv).r;
    float risk = d * 0.5 + s * 0.5;
    
    vec3 colour;
    if (risk < 0.3) {
      colour = vec3(0.2, 0.5, 0.9);
    } else if (risk < 0.6) {
      colour = vec3(0.9, 0.7, 0.2);
    } else if (risk < 0.8) {
      colour = vec3(0.9, 0.5, 0.1);
    } else {
      colour = vec3(0.9, 0.2, 0.15);
    }
    
    float alpha = risk > 0.05 ? 0.55 : 0.0;
    gl_FragColor = vec4(colour, alpha);
  }
`;

export class OverlayRenderer {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private densityTexture: THREE.DataTexture;
  private flowXTexture: THREE.DataTexture;
  private flowZTexture: THREE.DataTexture;
  private stressTexture: THREE.DataTexture;
  private gridWidth: number = 40;
  private gridHeight: number = 40;
  private currentMode: OverlayMode = 'normal';

  constructor(worldSize: number = 200) {
    this.gridWidth = 40;
    this.gridHeight = 40;

    const dataSize = this.gridWidth * this.gridHeight;
    this.densityTexture = new THREE.DataTexture(
      new Uint8Array(dataSize), this.gridWidth, this.gridHeight,
      THREE.RedFormat, THREE.UnsignedByteType,
    );
    this.densityTexture.needsUpdate = true;

    this.flowXTexture = new THREE.DataTexture(
      new Uint8Array(dataSize), this.gridWidth, this.gridHeight,
      THREE.RedFormat, THREE.UnsignedByteType,
    );
    this.flowXTexture.needsUpdate = true;

    this.flowZTexture = new THREE.DataTexture(
      new Uint8Array(dataSize), this.gridWidth, this.gridHeight,
      THREE.RedFormat, THREE.UnsignedByteType,
    );
    this.flowZTexture.needsUpdate = true;

    this.stressTexture = new THREE.DataTexture(
      new Uint8Array(dataSize), this.gridWidth, this.gridHeight,
      THREE.RedFormat, THREE.UnsignedByteType,
    );
    this.stressTexture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      vertexShader: overlayVertexShader,
      fragmentShader: densityFragmentShader,
      uniforms: {
        uDensity: { value: this.densityTexture },
        uFlowX: { value: this.flowXTexture },
        uFlowZ: { value: this.flowZTexture },
        uStress: { value: this.stressTexture },
        uMaxDensity: { value: 10.0 },
        uScale: { value: 1.0 },
        uColourLow: { value: new THREE.Color(0x1a1a1a) },
        uColourMed: { value: new THREE.Color(0x6b7a4a) },
        uColourHigh: { value: new THREE.Color(0xe5c100) },
        uColourCritical: { value: new THREE.Color(0xe63946) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const geo = new THREE.PlaneGeometry(worldSize, worldSize);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.05;
    this.mesh.name = 'overlay';
    this.mesh.visible = false;
  }

  getObject(): THREE.Mesh {
    return this.mesh;
  }

  setMode(mode: OverlayMode) {
    this.currentMode = mode;
    switch (mode) {
      case 'normal':
        this.mesh.visible = false;
        break;
      case 'density':
        this.mesh.visible = true;
        this.material.fragmentShader = densityFragmentShader;
        this.material.needsUpdate = true;
        break;
      case 'flow':
        this.mesh.visible = true;
        this.material.fragmentShader = flowFragmentShader;
        this.material.needsUpdate = true;
        break;
      case 'exit_pressure':
        this.mesh.visible = true;
        this.material.fragmentShader = densityFragmentShader;
        this.material.needsUpdate = true;
        break;
      case 'risk':
        this.mesh.visible = true;
        this.material.fragmentShader = riskFragmentShader;
        this.material.needsUpdate = true;
        break;
      case 'accessibility':
        this.mesh.visible = true;
        this.material.fragmentShader = densityFragmentShader;
        this.material.needsUpdate = true;
        break;
      case 'emergency':
        this.mesh.visible = true;
        this.material.fragmentShader = riskFragmentShader;
        this.material.needsUpdate = true;
        break;
    }
  }

  update(snapshot: Snapshot) {
    if (this.currentMode === 'normal') return;

    const gw = snapshot.grid_width;
    const gh = snapshot.grid_height;
    if (gw !== this.gridWidth || gh !== this.gridHeight) {
      this.gridWidth = gw;
      this.gridHeight = gh;
      const size = gw * gh;
      this.densityTexture.image = { width: gw, height: gh, data: new Uint8Array(size) };
      this.flowXTexture.image = { width: gw, height: gh, data: new Uint8Array(size) };
      this.flowZTexture.image = { width: gw, height: gh, data: new Uint8Array(size) };
      this.stressTexture.image = { width: gw, height: gh, data: new Uint8Array(size) };
    }

    const densityData = this.densityTexture.image.data as Uint8Array;
    const flowXData = this.flowXTexture.image.data as Uint8Array;
    const flowZData = this.flowZTexture.image.data as Uint8Array;
    const stressData = this.stressTexture.image.data as Uint8Array;

    let maxD = 0;
    for (let i = 0; i < snapshot.density_grid.length; i++) {
      const d = snapshot.density_grid[i];
      if (d > maxD) maxD = d;
      densityData[i] = Math.min(255, d * 50);
      stressData[i] = Math.min(255, d * 30);
    }

    this.material.uniforms.uMaxDensity.value = Math.max(maxD, 1.0);
    this.densityTexture.needsUpdate = true;
    this.stressTexture.needsUpdate = true;
    this.flowXTexture.needsUpdate = true;
    this.flowZTexture.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.densityTexture.dispose();
    this.flowXTexture.dispose();
    this.flowZTexture.dispose();
    this.stressTexture.dispose();
  }
}
