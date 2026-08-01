import * as THREE from 'three';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { AgentRenderer } from './AgentRenderer';
import { CameraController } from './CameraController';
import { OverlayRenderer } from './OverlayRenderer';
import type { Snapshot, AgentData } from '../net/types';

export class CrowdFluxEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraController: CameraController;
  private environment: EnvironmentBuilder;
  private agentRenderer: AgentRenderer;
  private overlayRenderer: OverlayRenderer;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private rafId: number = 0;
  private currentSnapshot: Snapshot | null = null;
  private prevSnapshot: Snapshot | null = null;
  private snapshotTime: number = 0;
  private prevAgentMap: Map<number, AgentData> = new Map();
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private fps: number = 0;
  private rainParticles: THREE.Points | null = null;
  private weatherIntensity: number = 0;
  private incidentMarkers: THREE.Group = new THREE.Group();
  private barrierMarkers: THREE.Group = new THREE.Group();
  private captureReady: boolean = false;
  private captureFrameCount: number = 0;
  private onFpsUpdate?: (fps: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x000000);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 150, 400);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    );
    this.camera.position.set(0, 130, 0.1);

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    this.environment = new EnvironmentBuilder();
    this.environment.build();
    this.scene.add(this.environment.getGroup());

    this.agentRenderer = new AgentRenderer();
    this.scene.add(this.agentRenderer.getObject());

    this.overlayRenderer = new OverlayRenderer(200);
    this.scene.add(this.overlayRenderer.getObject());

    this.scene.add(this.incidentMarkers);
    this.scene.add(this.barrierMarkers);

    this.clock = new THREE.Clock();

    this.setupResize();
  }

  private setupResize() {
    const onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
  }

  setOnFpsUpdate(cb: (fps: number) => void) {
    this.onFpsUpdate = cb;
  }

  setCameraMode(mode: any) {
    this.cameraController.setMode(mode);
  }

  setOverlayMode(mode: any) {
    this.overlayRenderer.setMode(mode);
  }

  setAgentColourMode(mode: any) {
    this.agentRenderer.setColourMode(mode);
  }

  setQualityProfile(profile: any) {
    this.agentRenderer.setQualityProfile(profile);
    switch (profile) {
      case 'low':
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(1);
        break;
      case 'medium':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        break;
      case 'high':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        break;
      case 'ultra':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        break;
    }
  }

  setReducedMotion(v: boolean) {
    this.cameraController.setReducedMotion(v);
  }

  setWeatherIntensity(intensity: number) {
    this.weatherIntensity = intensity;
    if (intensity > 0.1 && !this.rainParticles) {
      this.createRain();
    }
    if (this.rainParticles) {
      this.rainParticles.visible = intensity > 0.1;
      const mat = this.rainParticles.material as THREE.PointsMaterial;
      mat.opacity = intensity * 0.6;
    }

    // Adjust fog for weather
    if (intensity > 0.3) {
      this.scene.fog = new THREE.Fog(0x1a1a2a, 40, 150);
    } else {
      this.scene.fog = new THREE.Fog(0x000000, 150, 400);
    }
  }

  private createRain() {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8899aa,
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.rainParticles = new THREE.Points(geo, mat);
    this.rainParticles.name = 'rain';
    this.scene.add(this.rainParticles);
  }

  updateSnapshot(snapshot: Snapshot) {
    this.prevSnapshot = this.currentSnapshot;
    this.currentSnapshot = snapshot;
    this.snapshotTime = performance.now();

    // Build prev agent map for interpolation
    if (this.prevSnapshot) {
      this.prevAgentMap.clear();
      for (const a of this.prevSnapshot.agents) {
        this.prevAgentMap.set(a.id, a);
      }
    }

    // Update overlay
    this.overlayRenderer.update(snapshot);

    // Update weather
    this.setWeatherIntensity(snapshot.weather);

    // Update incident markers
    this.updateIncidentMarkers(snapshot.incidents);

    // Update barrier markers
    this.updateBarrierMarkers(snapshot.barriers);
  }

  private updateIncidentMarkers(incidents: any[]) {
    // Clear old markers
    while (this.incidentMarkers.children.length > 0) {
      const child = this.incidentMarkers.children[0];
      this.incidentMarkers.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    for (const inc of incidents) {
      if (!inc.active) continue;

      const colour = inc.kind === 'fire' ? 0xff3300 :
        inc.kind === 'medical' ? 0xff6600 :
        inc.kind === 'suspicious_package' ? 0xffaa00 :
        0xff4400;

      // Pulsing ring
      const ringGeo = new THREE.RingGeometry(3, 4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(inc.x, 0.1, inc.z);
      ring.userData = { incident: inc, isIncidentMarker: true };
      this.incidentMarkers.add(ring);

      // Vertical beam
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.5, 20, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.3,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(inc.x, 10, inc.z);
      this.incidentMarkers.add(beam);
    }
  }

  private updateBarrierMarkers(barriers: any[]) {
    while (this.barrierMarkers.children.length > 0) {
      const child = this.barrierMarkers.children[0];
      this.barrierMarkers.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    for (const b of barriers) {
      const geo = new THREE.BoxGeometry(b.length, 1.2, 0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8a7a3a,
        roughness: 0.6,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, 0.6, b.z);
      mesh.rotation.y = b.rotation;
      mesh.castShadow = true;
      this.barrierMarkers.add(mesh);
    }
  }

  focusOnIncident(x: number, z: number) {
    this.cameraController.setIncidentFocus(new THREE.Vector3(x, 0, z));
  }

  resetCamera() {
    this.cameraController.reset();
  }

  saveBookmark(name: string) {
    this.cameraController.saveBookmark(name);
  }

  loadBookmark(name: string): boolean {
    return this.cameraController.loadBookmark(name);
  }

  getBookmarks(): string[] {
    return this.cameraController.getBookmarks();
  }

  start() {
    this.animate();
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);

    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // FPS calculation
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.onFpsUpdate?.(this.fps);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    // Camera update
    this.cameraController.update(dt, time);

    // Agent rendering with interpolation
    if (this.currentSnapshot) {
      const snapshotAge = (performance.now() - this.snapshotTime) / 1000;
      const interpolationAlpha = Math.min(1, snapshotAge / 0.1);
      this.agentRenderer.update(
        this.currentSnapshot.agents,
        time,
        interpolationAlpha,
        this.prevAgentMap.size > 0 ? this.prevAgentMap : undefined,
      );
    }

    // Animate incident markers
    for (const child of this.incidentMarkers.children) {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
        const scale = 1 + Math.sin(time * 4) * 0.15;
        child.scale.set(scale, scale, 1);
      }
    }

    // Animate rain
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 30 * dt;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 60;
          positions[i] = (Math.random() - 0.5) * 200;
          positions[i + 2] = (Math.random() - 0.5) * 200;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Capture readiness
    if (this.currentSnapshot && this.frameCount >= 2) {
      this.captureFrameCount++;
    }

    this.renderer.render(this.scene, this.camera);
  };

  getFps(): number {
    return this.fps;
  }

  getVisibleAgents(): number {
    return this.agentRenderer.getVisibleCount();
  }

  setCaptureReady(v: boolean) {
    this.captureReady = v;
  }

  rebuildEnvironment(objects: { id: string; type: string; x: number; z: number; rotation: number; capacity: number }[]) {
    this.scene.remove(this.environment.getGroup());
    this.environment.buildFromObjects(objects);
    this.scene.add(this.environment.getGroup());

    // Recenter camera on the placed objects
    if (objects.length > 0) {
      let cx = 0, cz = 0;
      for (const o of objects) { cx += o.x; cz += o.z; }
      cx /= objects.length;
      cz /= objects.length;
      this.cameraController.setMode('tactical');
      this.camera.position.set(cx, 120, cz + 80);
      this.camera.lookAt(cx, 0, cz);
    }
  }

  isCaptureReady(): boolean {
    return this.captureReady && this.currentSnapshot !== null && this.captureFrameCount >= 2;
  }

  takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.agentRenderer.dispose();
    this.overlayRenderer.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
