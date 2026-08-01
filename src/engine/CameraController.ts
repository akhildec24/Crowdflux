import * as THREE from 'three';
import type { CameraMode } from '../net/types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private mode: CameraMode = 'tactical';
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private desiredPosition: THREE.Vector3 = new THREE.Vector3(0, 80, 100);
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 80, 100);
  private currentTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private orbitAngle: number = 0;
  private orbitSpeed: number = 0.0003;
  private orbitRadius: number = 120;
  private orbitHeight: number = 70;

  // Free camera
  private freeYaw: number = 0;
  private freePitch: number = -0.5;
  private freeDistance: number = 100;
  private keys: Set<string> = new Set();
  private mouseDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private reducedMotion: boolean = false;

  // Follow target
  private followTarget: THREE.Vector3 | null = null;

  // Incident focus
  private incidentPosition: THREE.Vector3 | null = null;

  // Bookmarks
  private bookmarks: Map<string, { position: THREE.Vector3; target: THREE.Vector3; mode: CameraMode }> = new Map();

  // Transition
  private transitioning: boolean = false;
  private transitionStart: number = 0;
  private transitionDuration: number = 1500;
  private transitionFromPos: THREE.Vector3 = new THREE.Vector3();
  private transitionToPos: THREE.Vector3 = new THREE.Vector3();
  private transitionFromTarget: THREE.Vector3 = new THREE.Vector3();
  private transitionToTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.setupInput();
  }

  private setupInput() {
    this.domElement.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.mouseDown) return;
      const dx = e.clientX - this.mouseX;
      const dy = e.clientY - this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.mode === 'free' || this.mode === 'tactical') {
        this.freeYaw -= dx * 0.005;
        this.freePitch = Math.max(-1.4, Math.min(1.4, this.freePitch - dy * 0.005));
      }
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode === 'free' || this.mode === 'tactical') {
        this.freeDistance = Math.max(20, Math.min(250, this.freeDistance + e.deltaY * 0.1));
      }
    });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  setMode(mode: CameraMode) {
    if (mode === this.mode) return;
    this.mode = mode;

    switch (mode) {
      case 'cinematic':
        this.transitionTo(this.orbitHeight, this.orbitRadius);
        break;
      case 'tactical':
        this.transitionTo(120, 0, 0);
        break;
      case 'free':
        this.transitionTo(this.currentPosition.y, this.freeDistance);
        break;
      case 'ground':
        this.transitionTo(2, 30);
        break;
      case 'follow':
        if (this.followTarget) {
          this.transitionTo(15, 25);
        }
        break;
      case 'incident':
        if (this.incidentPosition) {
          this.transitionTo(25, 40);
        }
        break;
    }
  }

  private transitionTo(height: number, radius: number, targetY: number = 0) {
    this.transitioning = true;
    this.transitionStart = performance.now();
    this.transitionFromPos.copy(this.currentPosition);
    this.transitionFromTarget.copy(this.currentTarget);

    switch (this.mode) {
      case 'cinematic':
        this.transitionToPos.set(
          Math.cos(this.orbitAngle) * this.orbitRadius,
          this.orbitHeight,
          Math.sin(this.orbitAngle) * this.orbitRadius,
        );
        this.transitionToTarget.set(0, 0, 0);
        break;
      case 'tactical':
        this.transitionToPos.set(0, 130, 0.1);
        this.transitionToTarget.set(0, 0, 0);
        break;
      case 'free':
        this.transitionToPos.copy(this.currentPosition);
        this.transitionToTarget.copy(this.currentTarget);
        break;
      case 'ground':
        this.transitionToPos.set(this.currentTarget.x + 5, 2, this.currentTarget.z + 15);
        this.transitionToTarget.copy(this.currentTarget);
        break;
      case 'follow':
        if (this.followTarget) {
          this.transitionToPos.set(this.followTarget.x + 10, 15, this.followTarget.z + 20);
          this.transitionToTarget.copy(this.followTarget);
        }
        break;
      case 'incident':
        if (this.incidentPosition) {
          this.transitionToPos.set(this.incidentPosition.x + 20, 25, this.incidentPosition.z + 30);
          this.transitionToTarget.copy(this.incidentPosition);
        }
        break;
    }
  }

  setFollowTarget(pos: THREE.Vector3) {
    this.followTarget = pos.clone();
    if (this.mode === 'follow') {
      this.transitionTo(15, 25);
    }
  }

  setIncidentFocus(pos: THREE.Vector3) {
    this.incidentPosition = pos.clone();
    if (this.mode !== 'incident') {
      this.setMode('incident');
    } else {
      this.transitionTo(25, 40);
    }
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
    this.orbitSpeed = v ? 0.0001 : 0.0003;
    this.transitionDuration = v ? 3000 : 1500;
  }

  saveBookmark(name: string) {
    this.bookmarks.set(name, {
      position: this.currentPosition.clone(),
      target: this.currentTarget.clone(),
      mode: this.mode,
    });
  }

  loadBookmark(name: string): boolean {
    const bm = this.bookmarks.get(name);
    if (!bm) return false;
    this.transitioning = true;
    this.transitionStart = performance.now();
    this.transitionFromPos.copy(this.currentPosition);
    this.transitionFromTarget.copy(this.currentTarget);
    this.transitionToPos.copy(bm.position);
    this.transitionToTarget.copy(bm.target);
    this.mode = bm.mode;
    return true;
  }

  getBookmarks(): string[] {
    return Array.from(this.bookmarks.keys());
  }

  reset() {
    this.transitioning = true;
    this.transitionStart = performance.now();
    this.transitionFromPos.copy(this.currentPosition);
    this.transitionFromTarget.copy(this.currentTarget);
    this.transitionToPos.set(0, 80, 100);
    this.transitionToTarget.set(0, 0, 0);
    this.mode = 'cinematic';
  }

  update(dt: number, time: number) {
    // Handle transition
    if (this.transitioning) {
      const elapsed = performance.now() - this.transitionStart;
      const t = Math.min(1, elapsed / this.transitionDuration);
      const eased = this.easeInOutCubic(t);

      this.currentPosition.lerpVectors(this.transitionFromPos, this.transitionToPos, eased);
      this.currentTarget.lerpVectors(this.transitionFromTarget, this.transitionToTarget, eased);

      if (t >= 1) {
        this.transitioning = false;
      }
    } else {
      switch (this.mode) {
        case 'cinematic':
          this.orbitAngle += this.orbitSpeed * dt * 60;
          this.currentPosition.set(
            Math.cos(this.orbitAngle) * this.orbitRadius,
            this.orbitHeight,
            Math.sin(this.orbitAngle) * this.orbitRadius,
          );
          this.currentTarget.set(0, 0, 0);
          break;

        case 'tactical': {
          // Top-down with slight angle, allow pan with WASD
          let panX = 0, panZ = 0;
          if (this.keys.has('w')) panZ -= 1;
          if (this.keys.has('s')) panZ += 1;
          if (this.keys.has('a')) panX -= 1;
          if (this.keys.has('d')) panX += 1;
          this.currentTarget.x += panX * dt * 40;
          this.currentTarget.z += panZ * dt * 40;
          this.currentPosition.set(
            this.currentTarget.x,
            130,
            this.currentTarget.z + 0.1,
          );
          break;
        }

        case 'free': {
          // Orbit around target with mouse, zoom with wheel, pan with WASD
          let panX = 0, panZ = 0;
          if (this.keys.has('w')) panZ -= 1;
          if (this.keys.has('s')) panZ += 1;
          if (this.keys.has('a')) panX -= 1;
          if (this.keys.has('d')) panX += 1;

          this.currentTarget.x += panX * dt * 30;
          this.currentTarget.z += panZ * dt * 30;

          const cosYaw = Math.cos(this.freeYaw);
          const sinYaw = Math.sin(this.freeYaw);
          const cosPitch = Math.cos(this.freePitch);
          const sinPitch = Math.sin(this.freePitch);

          this.currentPosition.set(
            this.currentTarget.x + sinYaw * cosPitch * this.freeDistance,
            this.currentTarget.y + sinPitch * this.freeDistance,
            this.currentTarget.z + cosYaw * cosPitch * this.freeDistance,
          );
          break;
        }

        case 'ground': {
          let panX = 0, panZ = 0;
          if (this.keys.has('w')) panZ -= 1;
          if (this.keys.has('s')) panZ += 1;
          if (this.keys.has('a')) panX -= 1;
          if (this.keys.has('d')) panX += 1;
          this.currentTarget.x += panX * dt * 15;
          this.currentTarget.z += panZ * dt * 15;
          this.currentPosition.set(
            this.currentTarget.x,
            2,
            this.currentTarget.z + 10,
          );
          break;
        }

        case 'follow':
          if (this.followTarget) {
            this.currentTarget.lerp(this.followTarget, 0.05);
            this.currentPosition.set(
              this.currentTarget.x + 10,
              15,
              this.currentTarget.z + 20,
            );
          }
          break;

        case 'incident':
          if (this.incidentPosition) {
            this.currentTarget.lerp(this.incidentPosition, 0.03);
            this.currentPosition.set(
              this.currentTarget.x + 20,
              25,
              this.currentTarget.z + 30,
            );
          }
          break;
      }
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  getPosition(): THREE.Vector3 {
    return this.currentPosition;
  }

  getTarget(): THREE.Vector3 {
    return this.currentTarget;
  }
}
