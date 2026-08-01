import * as THREE from 'three';

export interface FestivalObject {
  mesh: THREE.Object3D;
  type: string;
  id: string;
  position: THREE.Vector3;
}

export class EnvironmentBuilder {
  private group: THREE.Group;
  private objects: Map<string, FestivalObject> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'environment';
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  build(): void {
    this.buildGround();
    this.buildStages();
    this.buildFoodAreas();
    this.buildToilets();
    this.buildMedical();
    this.buildTicketGates();
    this.buildSecurityCheckpoints();
    this.buildTransportStops();
    this.buildParking();
    this.buildBarriers();
    this.buildBackstage();
    this.buildPaths();
    this.buildLighting();
  }

  private addBox(
    id: string,
    type: string,
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    color: number,
    opacity = 1.0,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
      transparent: opacity < 1.0,
      opacity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id, type };
    this.group.add(mesh);
    this.objects.set(id, { mesh, type, id, position: mesh.position });
    return mesh;
  }

  private buildGround() {
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData = { id: 'ground', type: 'ground' };
    this.group.add(ground);

    // Grass field overlay
    const grassGeo = new THREE.PlaneGeometry(160, 160);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e2e2e,
      roughness: 1.0,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.01;
    grass.receiveShadow = true;
    this.group.add(grass);
  }

  private buildPaths() {
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x383838,
      roughness: 0.9,
    });

    // Main path from entrance to stages
    const path1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 120), pathMat);
    path1.rotation.x = -Math.PI / 2;
    path1.position.set(0, 0.02, 20);
    path1.receiveShadow = true;
    this.group.add(path1);

    // Cross paths
    const path2 = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), pathMat);
    path2.rotation.x = -Math.PI / 2;
    path2.position.set(0, 0.02, 35);
    path2.receiveShadow = true;
    this.group.add(path2);

    const path3 = new THREE.Mesh(new THREE.PlaneGeometry(6, 80), pathMat);
    path3.rotation.x = -Math.PI / 2;
    path3.position.set(40, 0.02, 10);
    path3.receiveShadow = true;
    this.group.add(path3);

    const path4 = new THREE.Mesh(new THREE.PlaneGeometry(6, 80), pathMat);
    path4.rotation.x = -Math.PI / 2;
    path4.position.set(-40, 0.02, 10);
    path4.receiveShadow = true;
    this.group.add(path4);
  }

  private buildStages() {
    // Main stage — large structure at north
    const mainStageBase = this.addBox('main_stage', 'stage', 0, 1, -40, 40, 2, 20, 0x3a3a3a);
    // Stage roof
    const roofGeo = new THREE.BoxGeometry(44, 0.5, 24);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 10, -40);
    roof.castShadow = true;
    this.group.add(roof);

    // Roof supports
    for (const x of [-20, 20]) {
      for (const z of [-48, -32]) {
        const support = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 10),
          new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 }),
        );
        support.position.set(x, 5, z);
        support.castShadow = true;
        this.group.add(support);
      }
    }

    // Stage screen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 6),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: 0x4a7a9a,
        emissiveIntensity: 0.3,
        roughness: 0.3,
      }),
    );
    screen.position.set(0, 5, -49.5);
    this.group.add(screen);

    // Secondary stage
    this.addBox('sec_stage', 'stage', 60, 1, 0, 20, 2, 12, 0x3a3a3a);
    const secRoof = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.4, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 }),
    );
    secRoof.position.set(60, 6, 0);
    secRoof.castShadow = true;
    this.group.add(secRoof);

    for (const x of [51, 69]) {
      for (const z of [-5, 5]) {
        const support = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x444444 }),
        );
        support.position.set(x, 3, z);
        support.castShadow = true;
        this.group.add(support);
      }
    }
  }

  private buildFoodAreas() {
    // Food stalls — simple blocks with awning colours
    const foodPositions: [number, number, number][] = [
      [-30, 0, 20], [-25, 0, 20], [-35, 0, 20],
      [30, 0, 20], [25, 0, 20], [35, 0, 20],
      [0, 0, 40], [-5, 0, 40], [5, 0, 40],
    ];
    const foodColours = [0x404040, 0x383838, 0x424242, 0x383838, 0x404040];

    foodPositions.forEach((pos, i) => {
      const stall = this.addBox(
        `food_${i}`, 'food',
        pos[0], 1, pos[2],
        4, 2.5, 3,
        foodColours[i % foodColours.length],
      );
      // Awning
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.2, 3.5),
        new THREE.MeshStandardMaterial({ color: foodColours[(i + 2) % foodColours.length], roughness: 0.6 }),
      );
      awning.position.set(pos[0], 2.8, pos[2]);
      awning.castShadow = true;
      this.group.add(awning);
    });
  }

  private buildToilets() {
    const toiletPositions: [number, number][] = [
      [-45, 10], [45, 10], [-20, -10],
    ];
    toiletPositions.forEach((pos, i) => {
      this.addBox(`toilet_${i}`, 'toilet', pos[0], 1, pos[1], 6, 2.5, 4, 0x383838);
    });
  }

  private buildMedical() {
    this.addBox('medical', 'medical', -55, 1, -20, 8, 3, 6, 0x383838);
    // Medical cross
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xe63946 });
    const crossV = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4), crossMat);
    crossV.position.set(-55, 3.5, -17);
    this.group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.5), crossMat);
    crossH.position.set(-55, 3.5, -17);
    this.group.add(crossH);
  }

  private buildTicketGates() {
    for (const x of [-40, 40]) {
      this.addBox(`ticket_${x}`, 'ticket', x, 1, 75, 8, 1.5, 2, 0x383838);
      // Turnstile markers
      for (let i = -2; i <= 2; i++) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x555555 }),
        );
        post.position.set(x + i * 1.5, 0.6, 75);
        post.castShadow = true;
        this.group.add(post);
      }
    }
  }

  private buildSecurityCheckpoints() {
    for (const x of [-30, 30]) {
      this.addBox(`security_${x}`, 'security', x, 1, 65, 6, 2, 3, 0x383838);
      // Scanner frame
      const frame = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x4a7a9a, emissiveIntensity: 0.15 }),
      );
      frame.position.set(x, 1.5, 65);
      frame.rotation.x = Math.PI / 2;
      this.group.add(frame);
    }
  }

  private buildTransportStops() {
    // Bus stop
    this.addBox('bus_stop', 'transport', 70, 1, 70, 10, 2.5, 4, 0x383838);
    // Shelter
    const busShelter = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.6 }),
    );
    busShelter.position.set(70, 3, 70);
    this.group.add(busShelter);

    // Rail station
    this.addBox('rail_station', 'transport', -70, 1, 70, 12, 3, 6, 0x383838);
    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x444444 }),
    );
    platform.position.set(-70, 0.25, 70);
    platform.receiveShadow = true;
    this.group.add(platform);
  }

  private buildParking() {
    this.addBox('parking', 'parking', 0, 0.5, 85, 30, 1, 10, 0x2a2a2a);
    // Parking line markers
    for (let i = -12; i <= 12; i += 3) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 4),
        new THREE.MeshBasicMaterial({ color: 0x555555 }),
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(i, 1.01, 85);
      this.group.add(line);
    }
  }

  private buildBarriers() {
    // Temporary barriers around stage front
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xe5c100,
      roughness: 0.6,
      metalness: 0.3,
    });

    // Main stage barrier
    for (let x = -18; x <= 18; x += 3) {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.2, 0.3),
        barrierMat,
      );
      barrier.position.set(x, 0.6, -28);
      barrier.castShadow = true;
      barrier.userData = { id: `barrier_stage_${x}`, type: 'barrier' };
      this.group.add(barrier);
    }

    // Side barriers
    for (let z = -28; z <= -15; z += 3) {
      for (const x of [-19, 19]) {
        const barrier = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 1.2, 2.5),
          barrierMat,
        );
        barrier.position.set(x, 0.6, z);
        barrier.castShadow = true;
        this.group.add(barrier);
      }
    }
  }

  private buildBackstage() {
    // Restricted area behind main stage
    this.addBox('backstage', 'restricted', 0, 1.5, -55, 44, 3, 10, 0x2a2a2a, 0.8);

    // Backstage fence
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
    });
    for (let x = -22; x <= 22; x += 2) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.5),
        fenceMat,
      );
      post.position.set(x, 1.25, -50);
      this.group.add(post);
    }
  }

  private buildLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xaaaaaa, 0.6);
    this.group.add(ambient);

    // Directional (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0005;
    this.group.add(sun);

    // Hemisphere light for natural fill
    const hemi = new THREE.HemisphereLight(0x999999, 0x333333, 0.4);
    this.group.add(hemi);

    // Stage lights
    const stageLight1 = new THREE.SpotLight(0x4a7a9a, 0.6, 60, Math.PI / 6, 0.3);
    stageLight1.position.set(-15, 8, -45);
    stageLight1.target.position.set(0, 0, -40);
    this.group.add(stageLight1);
    this.group.add(stageLight1.target);

    const stageLight2 = new THREE.SpotLight(0xe63946, 0.6, 60, Math.PI / 6, 0.3);
    stageLight2.position.set(15, 8, -45);
    stageLight2.target.position.set(0, 0, -40);
    this.group.add(stageLight2);
    this.group.add(stageLight2.target);
  }

  getObjectById(id: string): FestivalObject | undefined {
    return this.objects.get(id);
  }

  getAllObjects(): FestivalObject[] {
    return Array.from(this.objects.values());
  }

  clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }
    this.objects.clear();
  }

  buildFromObjects(objects: { id: string; type: string; x: number; z: number; rotation: number; capacity: number }[]): void {
    this.clear();
    this.buildGround();
    this.buildLighting();

    const TYPE_COLOURS: Record<string, number> = {
      entrance: 0x3a8a5a,
      exit: 0x4a7a9a,
      emergency_exit: 0xe5c100,
      stage: 0xe63946,
      food: 0x6b7a4a,
      toilet: 0x555555,
      medical: 0xe63946,
      transport: 0x4a7a9a,
      parking: 0x444444,
      barrier: 0xe5c100,
    };

    const TYPE_SIZES: Record<string, [number, number, number]> = {
      entrance: [6, 3, 6],
      exit: [6, 3, 6],
      emergency_exit: [6, 3, 6],
      stage: [20, 6, 12],
      food: [8, 3, 8],
      toilet: [5, 3, 5],
      medical: [7, 3, 7],
      transport: [10, 3, 6],
      parking: [15, 1, 10],
      barrier: [8, 1, 1],
    };

    for (const obj of objects) {
      const colour = TYPE_COLOURS[obj.type] ?? 0x444444;
      const [w, h, d] = TYPE_SIZES[obj.type] ?? [5, 3, 5];
      const mesh = this.addBox(obj.id, obj.type, obj.x, h / 2, obj.z, w, h, d, colour);
      mesh.rotation.y = obj.rotation || 0;
    }
  }
}
