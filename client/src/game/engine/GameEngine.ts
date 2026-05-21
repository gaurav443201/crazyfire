import * as THREE from 'three';
import socketClient from '../../socket/socketClient';

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

  // Remote player models
  private remotePlayers: Map<string, THREE.Mesh> = new Map();
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

    window.addEventListener('resize', this.onWindowResize);
  }

  private buildWeaponMesh() {
    const group = new THREE.Group();

    // Receiver barrel
    const barrelGeom = new THREE.BoxGeometry(0.15, 0.15, 0.8);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
    const barrel = new THREE.Mesh(barrelGeom, darkMat);
    barrel.position.set(0.2, -0.3, -0.6);
    group.add(barrel);

    // Neon stripe highlight
    const lightGeom = new THREE.BoxGeometry(0.02, 0.02, 0.6);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const stripe = new THREE.Mesh(lightGeom, neonMat);
    stripe.position.set(0.18, -0.22, -0.6);
    group.add(stripe);

    this.weaponMesh = group;
    this.scene.add(this.weaponMesh);
  }

  private buildMap() {
    // Ground Grid
    const groundGeom = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create 3D layout geometries based on Map Name (Factory vs Rooftop)
    if (this.mapName === 'factory') {
      // Draw various industrial boxes
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const positions = [
        [-5, 2, -10, 4, 4, 4],
        [5, 2, -10, 3, 4, 3],
        [-10, 3, 5, 6, 6, 6],
        [12, 1.5, 8, 4, 3, 4],
        [0, 1, 15, 3, 2, 8]
      ];
      positions.forEach(([x, y, z, w, h, d]) => {
        const boxGeom = new THREE.BoxGeometry(w, h, d);
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.set(x, y, z);
        box.castShadow = true;
        box.receiveShadow = true;
        this.mapGeometry.add(box);
      });
    } else {
      // Skyscraper structures
      const neonMatBlue = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
      const neonMatRed = new THREE.MeshBasicMaterial({ color: 0xff2d55 });
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.9 });

      const towers = [
        [-15, 0, -15, 12, 40, 12],
        [15, 0, -15, 10, 35, 10],
        [-15, 0, 15, 12, 38, 12],
        [15, 0, 15, 10, 42, 10]
      ];

      towers.forEach(([x, y, z, w, h, d]) => {
        const towerGeom = new THREE.BoxGeometry(w, h, d);
        const tower = new THREE.Mesh(towerGeom, towerMat);
        tower.position.set(x, y - 10, z); // lower base
        this.mapGeometry.add(tower);

        // Add glowing neon stripes
        const stripeGeom = new THREE.BoxGeometry(0.2, h, 0.2);
        const neonStripe = new THREE.Mesh(stripeGeom, Math.random() > 0.5 ? neonMatBlue : neonMatRed);
        neonStripe.position.set(x + w / 2 + 0.1, y - 10 + h / 2, z + d / 2 + 0.1);
        this.mapGeometry.add(neonStripe);
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
        let mesh = this.remotePlayers.get(p.id);
        if (!mesh) {
          const geom = new THREE.CapsuleGeometry(0.4, 1.8, 4, 8);
          const mat = new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.5 });
          mesh = new THREE.Mesh(geom, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.scene.add(mesh);
          this.remotePlayers.set(p.id, mesh);
        }

        mesh.position.set(p.position.x, p.position.y, p.position.z);
        mesh.rotation.y = p.rotation.y;
        mesh.visible = p.isAlive;
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

  private shoot() {
    if (this.ammo <= 0) return;
    this.ammo--;
    this.onHUDUpdate(this.health, this.ammo, this.isADS);

    // Dynamic Recoil Sway
    this.recoilPitch += 0.05;
    this.recoilYaw += (Math.random() - 0.5) * 0.03;

    // Raycast target shot matching AUTHORITATIVE sync
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children);
    
    // Find closest player hit
    let closestTarget: string | null = null;
    let hitPos = new THREE.Vector3();

    for (const hit of intersects) {
      for (const [id, mesh] of this.remotePlayers.entries()) {
        if (hit.object === mesh) {
          closestTarget = id;
          hitPos.copy(hit.point);
          break;
        }
      }
      if (closestTarget) break;
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
