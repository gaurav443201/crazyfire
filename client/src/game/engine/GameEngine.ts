import * as THREE from 'three';
import socketClient from '../../socket/socketClient';
import { useGameStore } from '../../stores/gameStore';

export interface EntityState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  velocity: { x: number; y: number; z: number };
  health: number;
  isAlive: boolean;
  weapon: string;
}

export class GameEngine {
  private container: HTMLDivElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // Local movement states
  private keys: Record<string, boolean> = {};
  private playerPos = new THREE.Vector3(0, 1.6, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private pitch = 0;
  private isGrounded = true;
  private isSprinting = false;
  private isCrouching = false;
  private isSliding = false;
  private slideTimer = 0;
  private health = 100;
  private isAlive = true;

  // Camera bob & sway
  private bobTime = 0;
  private weaponMesh: THREE.Group | null = null;
  private recoilPitch = 0;
  private recoilYaw = 0;

  // Tracers & sparks lists
  private tracers: { line: THREE.Line; age: number; maxAge: number }[] = [];
  private particles: { system: THREE.Points; velocities: THREE.Vector3[]; age: number; maxAge: number }[] = [];
  private muzzleFlash: THREE.Mesh | null = null;
  private muzzleFlashAge = 0;
  private currentSpread = 10;

  // Remote player models
  private remotePlayers: Map<string, THREE.Object3D> = new Map();
  private mapGeometry: THREE.Group = new THREE.Group();

  // Settings
  private sensitivity = 0.002;
  private fov = 75;
  private mapName: string;

  // Callback to update HUD
  private onHUDUpdate: (health: number, ammo: number, isADS: boolean) => void;
  private ammo = 30;
  private maxAmmo = 30;
  private isADS = false;

  constructor(
    container: HTMLDivElement,
    mapName: string,
    onHUDUpdate: (health: number, ammo: number, isADS: boolean) => void
  ) {
    this.container = container;
    this.mapName = mapName;
    this.onHUDUpdate = onHUDUpdate;

    this.initThree();
    this.buildMap();
    this.setupInput();
    this.setupSocketEvents();
    this.animate();
  }

  private initThree() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#050a0f', 0.015);

    this.camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 1000);
    this.camera.position.copy(this.playerPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('#050a0f');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Dynamic environmental lighting
    const ambient = new THREE.AmbientLight('#0d1e2e', 0.6);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight('#00d4ff', 1.2);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);

    // Build FPS view model weapon placeholder
    this.buildWeaponMesh();
    
    // Build starfield and holographic dome
    this.buildAtmosphere();

    window.addEventListener('resize', this.onWindowResize);
  }

  private buildWeaponMesh() {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });
    
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.2
    });
    
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      toneMapped: false
    });

    // 1. Receiver body
    const bodyGeom = new THREE.BoxGeometry(0.12, 0.18, 0.6);
    const body = new THREE.Mesh(bodyGeom, carbonMat);
    body.position.set(0, 0, 0);
    group.add(body);

    // 2. Upper receiver rail
    const railGeom = new THREE.BoxGeometry(0.08, 0.04, 0.58);
    const rail = new THREE.Mesh(railGeom, metalMat);
    rail.position.set(0, 0.1, 0.01);
    group.add(rail);

    // 3. Barrel & muzzle brake
    const barrelGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    const barrel = new THREE.Mesh(barrelGeom, metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.45);
    group.add(barrel);
    
    const muzzleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8);
    const muzzle = new THREE.Mesh(muzzleGeom, metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.03, -0.73);
    group.add(muzzle);

    // 4. Curved magazine
    const magGeom = new THREE.BoxGeometry(0.05, 0.22, 0.12);
    const mag = new THREE.Mesh(magGeom, carbonMat);
    mag.position.set(0, -0.15, -0.08);
    mag.rotation.x = -0.15;
    group.add(mag);

    // 5. Stock
    const stockGeom = new THREE.BoxGeometry(0.07, 0.11, 0.22);
    const stock = new THREE.Mesh(stockGeom, carbonMat);
    stock.position.set(0, -0.01, 0.35);
    group.add(stock);

    // 6. Tactical Scope and reticle glass
    const scopeMountGeom = new THREE.BoxGeometry(0.03, 0.05, 0.06);
    const scopeMount = new THREE.Mesh(scopeMountGeom, metalMat);
    scopeMount.position.set(0, 0.14, -0.05);
    group.add(scopeMount);
    
    const scopeBodyGeom = new THREE.CylinderGeometry(0.026, 0.026, 0.22, 8);
    const scopeBody = new THREE.Mesh(scopeBodyGeom, metalMat);
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0, 0.18, -0.05);
    group.add(scopeBody);
    
    const scopeGlassGeom = new THREE.CircleGeometry(0.024, 8);
    const scopeGlassMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.6 });
    const scopeGlass = new THREE.Mesh(scopeGlassGeom, scopeGlassMat);
    scopeGlass.position.set(0, 0.18, -0.161);
    group.add(scopeGlass);

    // 7. Tactical grip & foregrip
    const gripGeom = new THREE.BoxGeometry(0.05, 0.14, 0.05);
    const grip = new THREE.Mesh(gripGeom, carbonMat);
    grip.position.set(0, -0.14, 0.1);
    grip.rotation.x = 0.2;
    group.add(grip);
    
    const foregripGeom = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const foregrip = new THREE.Mesh(foregripGeom, carbonMat);
    foregrip.position.set(0, -0.11, -0.28);
    foregrip.rotation.x = -0.1;
    group.add(foregrip);

    // 8. Glowing neon strips
    const strip1Geom = new THREE.BoxGeometry(0.012, 0.012, 0.38);
    const strip1 = new THREE.Mesh(strip1Geom, neonMat);
    strip1.position.set(0.055, 0.015, -0.05);
    group.add(strip1);
    
    const strip2Geom = new THREE.BoxGeometry(0.012, 0.012, 0.38);
    const strip2 = new THREE.Mesh(strip2Geom, neonMat);
    strip2.position.set(-0.055, 0.015, -0.05);
    group.add(strip2);
    
    // 9. Laser pointer module & thin beam visual
    const laserModuleGeom = new THREE.BoxGeometry(0.035, 0.035, 0.08);
    const laserModule = new THREE.Mesh(laserModuleGeom, metalMat);
    laserModule.position.set(0.045, 0.07, -0.34);
    group.add(laserModule);
    
    const laserBeamGeom = new THREE.CylinderGeometry(0.003, 0.003, 100, 4);
    const laserBeamMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
    const laserBeam = new THREE.Mesh(laserBeamGeom, laserBeamMat);
    laserBeam.rotation.x = Math.PI / 2;
    laserBeam.position.set(0.045, 0.07, -50.38);
    group.add(laserBeam);

    group.position.set(0.2, -0.25, -0.5);

    this.weaponMesh = group;
    this.scene.add(this.weaponMesh);
  }

  private createFloorTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base metal plate color
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, 512, 512);
    
    // Panel grid outlines
    ctx.strokeStyle = '#0a1d30';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);
    
    // Glowing neon sub-grid
    ctx.strokeStyle = '#005577';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 480, 480);
    
    // Circuit/sci-fi detail lines
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 256);
    ctx.lineTo(100, 256);
    ctx.lineTo(130, 286);
    ctx.moveTo(496, 256);
    ctx.lineTo(412, 256);
    ctx.lineTo(382, 226);
    ctx.stroke();

    // Cyber panel corners
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(20, 20, 10, 10);
    ctx.fillRect(482, 20, 10, 10);
    ctx.fillRect(20, 482, 10, 10);
    ctx.fillRect(482, 482, 10, 10);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20); // 5m panels over 100m plane
    return texture;
  }

  private createContainerTexture(baseColor: string, addWarning: boolean): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.strokeStyle = '#0d1520';
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(32, 32, 192, 192);
    
    ctx.strokeStyle = '#0d1520';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(224, 224);
    ctx.moveTo(224, 32);
    ctx.lineTo(32, 224);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    const points = [
      [16, 16], [128, 16], [240, 16],
      [16, 128], [240, 128],
      [16, 240], [128, 240], [240, 240]
    ];
    points.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    if (addWarning) {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(8, 8, 240, 32);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      for (let x = 15; x < 240; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x + 12, 40);
        ctx.stroke();
      }
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  private createIndustrialContainer(w: number, h: number, d: number, baseColor: string, isHazard: boolean): THREE.Group {
    const group = new THREE.Group();
    
    const containerTex = this.createContainerTexture(baseColor, isHazard);
    const boxMat = new THREE.MeshStandardMaterial({
      map: containerTex,
      roughness: 0.5,
      metalness: 0.6
    });
    
    const bodyGeom = new THREE.BoxGeometry(w - 0.05, h - 0.05, d - 0.05);
    const body = new THREE.Mesh(bodyGeom, boxMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    const edgeFrameGeom = new THREE.BoxGeometry(w, h, d);
    const edgeFrame = new THREE.Mesh(
      edgeFrameGeom,
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        wireframe: true,
        roughness: 0.9
      })
    );
    group.add(edgeFrame);
    
    if (isHazard && Math.random() > 0.4) {
      const screenGeom = new THREE.PlaneGeometry(w * 0.4, h * 0.25);
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#22c55e';
      ctx.font = '8px monospace';
      ctx.fillText('SYS:OK', 4, 12);
      ctx.fillText('CRATE_4', 4, 24);
      
      const screenTex = new THREE.CanvasTexture(canvas);
      const screenMat = new THREE.MeshBasicMaterial({
        map: screenTex,
        toneMapped: false
      });
      const screen = new THREE.Mesh(screenGeom, screenMat);
      screen.position.set(0, 0, d / 2 + 0.01);
      group.add(screen);
    }
    
    return group;
  }

  private createBuildingTexture(w: number, d: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, 256, 512);
    
    for (let y = 16; y < 496; y += 24) {
      for (let x = 12; x < 244; x += 16) {
        if (Math.random() > 0.65) {
          ctx.fillStyle = Math.random() > 0.5 ? '#00d4ff' : '#ffd300';
          ctx.fillRect(x, y, 10, 14);
        } else {
          ctx.fillStyle = '#111e2e';
          ctx.fillRect(x, y, 10, 14);
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.ceil((w + d) / 8), 1);
    return texture;
  }

  private createSkyscraper(w: number, h: number, d: number): THREE.Group {
    const group = new THREE.Group();
    
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x070c14,
      roughness: 0.7,
      metalness: 0.8,
      map: this.createBuildingTexture(w, d)
    });
    
    const towerGeom = new THREE.BoxGeometry(w, h, d);
    const tower = new THREE.Mesh(towerGeom, towerMat);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);
    
    if (Math.random() > 0.5) {
      const dishMountGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
      const dishMount = new THREE.Mesh(dishMountGeom, new THREE.MeshStandardMaterial({ color: 0x475569 }));
      dishMount.position.set(0, h / 2 + 0.6, 0);
      group.add(dishMount);
      
      const dishGeom = new THREE.ConeGeometry(0.8, 0.4, 12, 1, true);
      const dish = new THREE.Mesh(dishGeom, new THREE.MeshStandardMaterial({ color: 0x64748b, side: THREE.DoubleSide }));
      dish.position.set(0, h / 2 + 1.2, 0);
      dish.rotation.x = Math.PI / 4;
      group.add(dish);
    } else {
      const spireGeom = new THREE.CylinderGeometry(0.04, 0.08, 3, 6);
      const spire = new THREE.Mesh(spireGeom, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      spire.position.set(0, h / 2 + 1.5, 0);
      group.add(spire);
      
      const beaconGeom = new THREE.SphereGeometry(0.12, 6, 6);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(0, h / 2 + 3, 0);
      group.add(beacon);
    }
    
    return group;
  }

  private buildAtmosphere() {
    // 1. Starfield particles
    const starsGeom = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 200 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta));
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      const rand = Math.random();
      if (rand < 0.4) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      } else if (rand < 0.7) {
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.83; colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.17; colors[i * 3 + 2] = 0.4;
      }
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });
    const starField = new THREE.Points(starsGeom, starsMat);
    this.scene.add(starField);

    // 2. Holographic grid dome
    const domeGeom = new THREE.SphereGeometry(150, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    this.scene.add(dome);
  }

  private createCyborgMesh(team: string): THREE.Group {
    const group = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({
      color: team === 'alpha' ? 0x00d4ff : 0xff2d55,
      roughness: 0.3,
      metalness: 0.8
    });
    
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const visorMat = new THREE.MeshBasicMaterial({
      color: team === 'alpha' ? 0x00ffff : 0xff3366,
      toneMapped: false
    });

    const chestGeom = new THREE.BoxGeometry(0.7, 0.8, 0.4);
    const chest = new THREE.Mesh(chestGeom, carbonMat);
    chest.position.set(0, 0.9, 0);
    chest.castShadow = true;
    chest.receiveShadow = true;
    group.add(chest);
    
    const plateGeom = new THREE.BoxGeometry(0.5, 0.6, 0.44);
    const plate = new THREE.Mesh(plateGeom, bodyMat);
    plate.position.set(0, 0.95, 0.02);
    group.add(plate);

    const headGeom = new THREE.SphereGeometry(0.22, 12, 12);
    const head = new THREE.Mesh(headGeom, carbonMat);
    head.position.set(0, 1.45, 0);
    group.add(head);
    
    const visorGeom = new THREE.BoxGeometry(0.3, 0.08, 0.1);
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 1.48, 0.16);
    group.add(visor);

    const leftPadGeom = new THREE.SphereGeometry(0.18, 8, 8);
    const leftPad = new THREE.Mesh(leftPadGeom, bodyMat);
    leftPad.position.set(-0.45, 1.2, 0);
    group.add(leftPad);
    
    const rightPadGeom = new THREE.SphereGeometry(0.18, 8, 8);
    const rightPad = new THREE.Mesh(rightPadGeom, bodyMat);
    rightPad.position.set(0.45, 1.2, 0);
    group.add(rightPad);

    const limbMat = carbonMat;
    
    const leftLegGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 8);
    const leftLeg = new THREE.Mesh(leftLegGeom, limbMat);
    leftLeg.position.set(-0.2, 0.4, 0);
    group.add(leftLeg);
    
    const rightLegGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 8);
    const rightLeg = new THREE.Mesh(rightLegGeom, limbMat);
    rightLeg.position.set(0.2, 0.4, 0);
    group.add(rightLeg);
    
    const leftArmGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8);
    const leftArm = new THREE.Mesh(leftArmGeom, limbMat);
    leftArm.position.set(-0.45, 0.85, 0);
    leftArm.rotation.z = 0.1;
    group.add(leftArm);
    
    const rightArmGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8);
    const rightArm = new THREE.Mesh(rightArmGeom, limbMat);
    rightArm.position.set(0.45, 0.85, 0);
    rightArm.rotation.z = -0.1;
    group.add(rightArm);
    
    const packGeom = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    const pack = new THREE.Mesh(packGeom, carbonMat);
    pack.position.set(0, 0.95, -0.2);
    group.add(pack);

    const coreGeom = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    const core = new THREE.Mesh(coreGeom, visorMat);
    core.position.set(0, 0.95, -0.31);
    group.add(core);

    chest.position.y -= 0.9;
    plate.position.y -= 0.9;
    head.position.y -= 0.9;
    visor.position.y -= 0.9;
    leftPad.position.y -= 0.9;
    rightPad.position.y -= 0.9;
    leftLeg.position.y -= 0.9;
    rightLeg.position.y -= 0.9;
    leftArm.position.y -= 0.9;
    rightArm.position.y -= 0.9;
    pack.position.y -= 0.9;
    core.position.y -= 0.9;

    return group;
  }

  private buildMap() {
    // 1. Floor Upgrade with metal panel grid texture
    const groundGeom = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.createFloorTexture(),
      roughness: 0.4,
      metalness: 0.8
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Map structures
    if (this.mapName === 'factory') {
      const positions = [
        [-5, 2, -10, 4, 4, 4, '#1e293b', true],
        [5, 2, -10, 3, 4, 3, '#334155', false],
        [-10, 3, 5, 6, 6, 6, '#1e293b', true],
        [12, 1.5, 8, 4, 3, 4, '#475569', false],
        [0, 1, 15, 3, 2, 8, '#334155', true]
      ] as const;

      positions.forEach(([x, y, z, w, h, d, color, isHazard]) => {
        const container = this.createIndustrialContainer(w, h, d, color, isHazard);
        container.position.set(x, y, z);
        this.mapGeometry.add(container);

        // Add small point light at hazard containers to glow
        if (isHazard) {
          const light = new THREE.PointLight(0x00d4ff, 0.8, 8);
          light.position.set(x, y + h / 2 + 0.5, z);
          this.mapGeometry.add(light);
        }
      });
    } else {
      const towers = [
        [-15, 0, -15, 12, 40, 12],
        [15, 0, -15, 10, 35, 10],
        [-15, 0, 15, 12, 38, 12],
        [15, 0, 15, 10, 42, 10]
      ];

      towers.forEach(([x, y, z, w, h, d]) => {
        const tower = this.createSkyscraper(w, h, d);
        tower.position.set(x, y - 10 + h / 2, z);
        this.mapGeometry.add(tower);

        // Add skyscraper peak warning light glow
        const light = new THREE.PointLight(0xff0033, 1.2, 15);
        light.position.set(x, y - 10 + h + 3.1, z);
        this.mapGeometry.add(light);
      });
    }

    this.scene.add(this.mapGeometry);
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyC') this.toggleCrouch();
      if (e.code === 'KeyR') this.reload();
      if (e.code === 'ShiftLeft') this.isSprinting = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft') this.isSprinting = false;
    });

    // Pointer Lock look Controls
    this.container.addEventListener('click', () => {
      if (this.isAlive) this.container.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.container || !this.isAlive) return;

      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    });

    this.container.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.container || !this.isAlive) return;
      if (e.button === 0) this.shoot();
      if (e.button === 2) {
        this.isADS = true;
        this.camera.fov = this.fov - 20;
        this.camera.updateProjectionMatrix();
        this.onHUDUpdate(this.health, this.ammo, this.isADS);
      }
    });

    this.container.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isADS = false;
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
        this.onHUDUpdate(this.health, this.ammo, this.isADS);
      }
    });
  }

  private setupSocketEvents() {
    socketClient.on('game:state', ({ players }: { players: EntityState[] }) => {
      players.forEach(p => {
        if (p.id === socketClient.id) {
          // Sync current health authoritative state
          this.health = p.health;
          this.isAlive = p.isAlive;
          this.onHUDUpdate(this.health, this.ammo, this.isADS);
          return;
        }

        // Render or update remote player meshes
        let playerObj = this.remotePlayers.get(p.id);
        if (!playerObj) {
          const playerStoreInfo = useGameStore.getState().room?.players.find(x => x.id === p.id);
          const team = playerStoreInfo?.team || 'bravo';
          
          playerObj = this.createCyborgMesh(team);
          this.scene.add(playerObj);
          this.remotePlayers.set(p.id, playerObj);
        }

        playerObj.position.set(p.position.x, p.position.y, p.position.z);
        playerObj.rotation.y = p.rotation.y;
        playerObj.visible = p.isAlive;
      });
    });

    socketClient.on('player:respawn', ({ id, position }: { id: string; position: { x: number; y: number; z: number } }) => {
      if (id === socketClient.id) {
        this.playerPos.set(position.x, position.y, position.z);
        this.playerVel.set(0, 0, 0);
        this.health = 100;
        this.isAlive = true;
        this.onHUDUpdate(this.health, this.ammo, this.isADS);
      }
    });
  }

  private toggleCrouch() {
    this.isCrouching = !this.isCrouching;
    if (this.isCrouching && this.isSprinting && this.playerVel.lengthSq() > 10) {
      this.isSliding = true;
      this.slideTimer = 1.0; // 1 second sliding
    }
  }

  private reload() {
    if (this.ammo === this.maxAmmo) return;
    // Reload animation simulation
    setTimeout(() => {
      this.ammo = this.maxAmmo;
      this.onHUDUpdate(this.health, this.ammo, this.isADS);
    }, 1200);
  }

  private triggerMuzzleFlash() {
    if (!this.weaponMesh) return;
    
    if (this.muzzleFlash) {
      this.scene.remove(this.muzzleFlash);
      this.muzzleFlash.geometry.dispose();
      (this.muzzleFlash.material as THREE.Material).dispose();
      this.muzzleFlash = null;
    }
    
    const geom = new THREE.ConeGeometry(0.06, 0.2, 8);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    this.muzzleFlash = new THREE.Mesh(geom, mat);
    this.muzzleFlash.position.set(0, 0.03, -0.82);
    this.weaponMesh.add(this.muzzleFlash);
    this.muzzleFlashAge = 0.05;
  }

  private spawnBulletTracer(start: THREE.Vector3, end: THREE.Vector3) {
    const points = [start, end];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
    
    this.tracers.push({
      line,
      age: 0,
      maxAge: 0.15
    });
  }

  private spawnImpactSparks(pos: THREE.Vector3) {
    const particleCount = 12;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() * 3) + 1,
        (Math.random() - 0.5) * 4
      );
      velocities.push(vel);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.08,
      transparent: true,
      opacity: 0.9
    });
    
    const system = new THREE.Points(geom, mat);
    this.scene.add(system);
    
    this.particles.push({
      system,
      velocities,
      age: 0,
      maxAge: 0.4
    });
  }

  private shoot() {
    if (this.ammo <= 0) return;
    this.ammo--;
    this.onHUDUpdate(this.health, this.ammo, this.isADS);

    this.triggerMuzzleFlash();

    // Dynamic Recoil Sway
    this.recoilPitch += 0.05;
    this.recoilYaw += (Math.random() - 0.5) * 0.03;

    // Raycast target shot matching AUTHORITATIVE sync
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    let closestTarget: string | null = null;
    const hitPos = new THREE.Vector3();
    let hitObject: THREE.Intersection | null = null;

    for (const hit of intersects) {
      let isWeapon = false;
      let currObj: THREE.Object3D | null = hit.object;
      while (currObj && currObj !== this.scene) {
        if (currObj === this.weaponMesh) {
          isWeapon = true;
          break;
        }
        currObj = currObj.parent;
      }
      if (isWeapon) continue;

      hitObject = hit;
      hitPos.copy(hit.point);

      let current: THREE.Object3D | null = hit.object;
      while (current && current !== this.scene) {
        for (const [id, obj] of this.remotePlayers.entries()) {
          if (current === obj) {
            closestTarget = id;
            break;
          }
        }
        if (closestTarget) break;
        current = current.parent;
      }
      break;
    }

    const muzzlePos = new THREE.Vector3(0.2, -0.25, -0.8);
    if (this.isADS) muzzlePos.set(0, -0.18, -0.8);
    muzzlePos.applyQuaternion(this.camera.quaternion).add(this.playerPos);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const endPos = hitObject ? hitPos : muzzlePos.clone().addScaledVector(dir, 100);

    this.spawnBulletTracer(muzzlePos, endPos);

    if (hitObject) {
      this.spawnImpactSparks(hitPos);
    }

    if (closestTarget) {
      socketClient.emit('player:shoot', {
        targetId: closestTarget,
        hitPosition: { x: hitPos.x, y: hitPos.y, z: hitPos.z },
        weapon: 'm4a1',
        timestamp: Date.now()
      });
    }
  }

  private updateMovement(dt: number) {
    if (!this.isAlive) return;

    // Calculate look direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDirection = new THREE.Vector3();

    if (this.keys['KeyW']) moveDirection.add(forward);
    if (this.keys['KeyS']) moveDirection.add(forward.clone().negate());
    if (this.keys['KeyA']) moveDirection.add(right.clone().negate());
    if (this.keys['KeyD']) moveDirection.add(right);

    moveDirection.normalize();

    // Speed constants inspired by COD Mobile and Krunker fast movement
    let speed = this.isSprinting ? 8.5 : 5.0;
    if (this.isCrouching) speed = 2.5;

    // Slide physics handling
    if (this.isSliding) {
      this.slideTimer -= dt;
      speed = this.slideTimer * 12.0 + 3.0;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    // Apply movement speeds
    const targetVelX = moveDirection.x * speed;
    const targetVelZ = moveDirection.z * speed;

    // Friction & momentum interpolation
    this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVelX, dt * 10);
    this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVelZ, dt * 10);

    // Gravity logic
    if (!this.isGrounded) {
      this.playerVel.y -= 25.0 * dt; // gravity speed
    }

    // Jump trigger
    if (this.keys['Space'] && this.isGrounded) {
      this.playerVel.y = 8.5; // Jump strength
      this.isGrounded = false;
    }

    // Move player position capsule
    this.playerPos.addScaledVector(this.playerVel, dt);

    // Flat collision with ground
    const groundHeight = this.isCrouching ? 0.9 : 1.6;
    if (this.playerPos.y <= groundHeight) {
      this.playerPos.y = groundHeight;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    // Update camera look matrix
    const totalPitch = this.pitch + this.recoilPitch;
    const totalYaw = this.yaw + this.recoilYaw;

    const cameraRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(totalPitch, totalYaw, 0, 'YXZ'));
    this.camera.position.copy(this.playerPos);
    this.camera.quaternion.copy(cameraRot);

    // Decay dynamic recoil
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, dt * 8);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, dt * 8);

    // Animate weapon head bob and sway
    if (this.weaponMesh) {
      // Align weapon group position slightly offset to screen right
      const weaponOffset = new THREE.Vector3(0.18, -0.22, -0.5);
      if (this.isADS) weaponOffset.set(0, -0.15, -0.4); // center barrel when aiming down sights
      
      weaponOffset.applyQuaternion(cameraRot);
      this.weaponMesh.position.copy(this.playerPos).add(weaponOffset);
      this.weaponMesh.quaternion.copy(cameraRot);

      // Simple weapon sway bob animation
      if (moveDirection.lengthSq() > 0 && this.isGrounded) {
        this.bobTime += dt * (this.isSprinting ? 14 : 8);
        const bobX = Math.sin(this.bobTime) * 0.015;
        const bobY = Math.cos(this.bobTime * 2) * 0.015;
        this.weaponMesh.position.x += bobX;
        this.weaponMesh.position.y += bobY;
      }
    }

    // Compute crosshair spread
    const vel2D = new THREE.Vector2(this.playerVel.x, this.playerVel.z);
    const moveSpeed = vel2D.length();
    
    let targetSpread = 10;
    if (moveSpeed > 1) {
      targetSpread += moveSpeed * 2.2;
    }
    if (this.isSprinting) {
      targetSpread += 15;
    }
    if (!this.isGrounded) {
      targetSpread += 35;
    }
    if (this.isCrouching) {
      targetSpread *= 0.55;
    }
    if (this.isADS) {
      targetSpread = 0;
    }
    targetSpread += this.recoilPitch * 180;
    
    this.currentSpread = THREE.MathUtils.lerp(this.currentSpread, targetSpread, dt * 10);
    useGameStore.setState({ crosshairSpread: this.currentSpread });

    // Animate muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlashAge -= dt;
      if (this.muzzleFlashAge <= 0) {
        if (this.weaponMesh) this.weaponMesh.remove(this.muzzleFlash);
        this.muzzleFlash.geometry.dispose();
        (this.muzzleFlash.material as THREE.Material).dispose();
        this.muzzleFlash = null;
      }
    }

    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i];
      tracer.age += dt;
      if (tracer.age >= tracer.maxAge) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        (tracer.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        const mat = tracer.line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.8 * (1 - tracer.age / tracer.maxAge);
      }
    }

    // Update impact particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.system);
        p.system.geometry.dispose();
        (p.system.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      } else {
        const posAttr = p.system.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let j = 0; j < p.velocities.length; j++) {
          const vel = p.velocities[j];
          vel.y -= 9.8 * dt; // gravity
          
          let px = posAttr.getX(j) + vel.x * dt;
          let py = posAttr.getY(j) + vel.y * dt;
          let pz = posAttr.getZ(j) + vel.z * dt;
          
          if (py < 0) {
            py = 0;
            vel.y = -vel.y * 0.4;
            vel.x *= 0.6;
            vel.z *= 0.6;
          }
          
          posAttr.setXYZ(j, px, py, pz);
        }
        posAttr.needsUpdate = true;
        
        const mat = p.system.material as THREE.PointsMaterial;
        mat.opacity = 0.9 * (1 - p.age / p.maxAge);
      }
    }

    // Autoritative coordinate broadcast (20 ticks/sec rate limit handled by loop delay)
    socketClient.emit('player:move', {
      position: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      rotation: { x: this.pitch, y: this.yaw },
      velocity: { x: this.playerVel.x, y: this.playerVel.y, z: this.playerVel.z },
      timestamp: Date.now()
    });
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    // Lock Delta values
    const dt = 1 / 60; // lock step physics updates

    this.updateMovement(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    document.exitPointerLock();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
