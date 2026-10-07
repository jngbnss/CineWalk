import * as THREE from 'three';
import { createSunsetLighting, pointLight } from '../environment/Lighting';
import { Water } from '../environment/Ocean';
import { concrete, grass, hexGrid, holoScreen, rock, wood } from '../environment/ProceduralTextures';
import { createSunsetSky } from '../environment/Sky';
import { treeFactory } from './props/Trees';
import { buildConceptCar } from './props/Vehicles';
import { World, type Rect, type Vec3, type WorldContext, type WorldInfo } from './World';

export const futuristicCliffInfo: WorldInfo = {
  id: 'futuristic-cliff',
  name: 'Futuristic Cliff House',
  tagline: "Explore a futuristic inventor's home above the ocean.",
  summary:
    "An original glass-and-concrete house cantilevered over a sea cliff at sunset, home to a reclusive inventor. " +
    'Upstairs: a living room with a holographic table and an ocean deck. Downstairs: a hidden laboratory, a robot workshop ' +
    'and a garage of electric concept cars on turntables.',
  cardArt:
    'radial-gradient(110% 80% at 50% 105%, rgba(255,140,70,.65), transparent 55%), linear-gradient(170deg,#1b2a44 0%,#6a3a52 55%,#ff9a5a 100%)',
  accent: '#5ad8ff',
  spawn: { position: [-30, 0, 2], yaw: Math.atan2(-10, 2) },
  bounds: { minX: -120, maxX: 120, minZ: -120, maxZ: 18 },
  pois: [
    {
      id: 'living-room',
      name: 'Living Room',
      description: 'Floor-to-ceiling glass, a sunken sofa and a holographic table.',
      position: [6, 0, -6],
      radius: 4.5,
      facts: [
        'The front wall is a single run of low-iron glass facing due west over the ocean.',
        'The coffee table projects a slowly rotating hologram of whatever the owner is working on.',
      ],
      story: 'The owner claims to do his best thinking here at sunset — the house dims its own lights when the sun touches the horizon.',
    },
    {
      id: 'ocean-deck',
      name: 'Ocean Deck',
      description: 'A glass-railed deck cantilevered thirty metres above the sea.',
      position: [0, 0, 14],
      radius: 4,
      facts: [
        'The deck projects eight metres past the cliff edge on two steel struts.',
        'Sea level is thirty metres below; on calm evenings you can hear the surf.',
      ],
      story: 'The first prototype flight suit was tested off this deck. The second one, too. There is a reason the railings are new.',
    },
    {
      id: 'garage',
      name: 'Garage',
      description: 'Three electric concept cars turning slowly on lit platforms.',
      position: [30, 0, -6],
      radius: 5.5,
      facts: [
        'Each turntable rotates continuously so the cars can be inspected from every angle.',
        'All three vehicles are original fictional designs — low wedges with full-width light bars.',
      ],
      story: 'Nobody remembers the last time any of these cars left the garage. They are, the owner insists, "works in progress."',
    },
    {
      id: 'laboratory',
      name: 'Laboratory',
      description: 'A hidden lab under the house, humming around a glowing energy core.',
      position: [-7, -6, -15],
      radius: 4,
      facts: [
        'The lab is reached by the glass-railed stair beside the kitchen.',
        'The core in the centre is a fictional prototype power cell — the rings are magnetic containment.',
      ],
      story: 'Every screen down here shows a different unfinished idea. The owner says the core is "nearly stable."',
    },
    {
      id: 'robot-workshop',
      name: 'Robot Workshop',
      description: 'Two robotic arms and a half-built humanoid frame.',
      position: [5, -6, -14],
      radius: 4,
      facts: [
        'The arms run a looping calibration routine whenever the lab is occupied.',
        'The humanoid frame on the platform is missing its outer shell — and, apparently, a name.',
      ],
      story: 'One of the arms is notoriously clumsy. The owner keeps threatening to donate it to a community college.',
    },
  ],
  portals: [
    {
      id: 'to-jazz',
      targetWorldId: 'jazz-mansion',
      label: 'Jazz Mansion',
      position: [-34, 0, -10],
      radius: 2.2,
      color: 0xffb347,
      facing: 0.32,
    },
  ],
};

const STAIR_HOLE: Rect = { minX: -18, maxX: -14, minZ: -18, maxZ: -6 };
const LAB: Rect = { minX: -20, maxX: 10, minZ: -22, maxZ: -4 };

export class FuturisticCliffWorld extends World {
  readonly info = futuristicCliffInfo;

  protected async build(ctx: WorldContext): Promise<void> {
    const { scene, renderer, loading } = ctx;

    // ── Environment ─────────────────────────────────────────
    const sky = createSunsetSky(3, 15);
    this.add(sky.object);
    this.add(createSunsetLighting(sky.sunDirection).object);
    scene.fog = new THREE.Fog(0xc98e7a, 160, 1500);
    scene.environment = renderer.environment;
    scene.environmentIntensity = 0.6;
    renderer.three.toneMappingExposure = 0.75;
    loading.stage(0.25, 'Pouring concrete…');

    const screenTex = (title: string, w: number, h: number) => {
      const t = this.tex(holoScreen(title));
      t.repeat.set(1 / w, 1 / h);
      return t;
    };
    const hex = this.tex(hexGrid());
    const M = {
      ground: this.std({ map: this.tex(grass('#6b6436')), roughness: 1 }),
      concrete: this.std({ map: this.tex(concrete()), roughness: 0.6 }),
      floor: this.std({ color: 0xe9e9eb, roughness: 0.14 }),
      glass: this.std({ color: 0x9fd8ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      steel: this.std({ color: 0x8a9099, metalness: 1, roughness: 0.32 }),
      dark: this.std({ color: 0x15181d, roughness: 0.45, metalness: 0.3 }),
      fabric: this.std({ color: 0xd8d4cc, roughness: 0.95 }),
      rug: this.std({ color: 0x2a2d33, roughness: 1 }),
      deck: this.std({ map: this.tex(wood('#6b4a2e')), roughness: 0.7 }),
      rock: this.std({ map: this.tex(rock()), roughness: 0.95 }),
      labFloor: this.std({ map: hex, emissiveMap: hex, emissive: 0x40c8ff, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5 }),
      labWall: this.std({ color: 0x1b2027, roughness: 0.6, metalness: 0.4 }),
      cyan: this.std({ color: 0x000000, emissive: 0x5ad8ff, emissiveIntensity: 3 }),
      warm: this.std({ color: 0x000000, emissive: 0xffc890, emissiveIntensity: 2.2 }),
      white: this.std({ color: 0x000000, emissive: 0xe8f2ff, emissiveIntensity: 2.5 }),
      core: this.std({ color: 0xffffff, emissive: 0x7fe6ff, emissiveIntensity: 5 }),
      holo: this.resources.track(
        new THREE.MeshBasicMaterial({ color: 0x5ad8ff, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
      ),
    };
    const screen = (title: string, w: number, h: number) => {
      const t = screenTex(title, w, h);
      return this.std({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.1 });
    };

    // ── Plateau, cliff, ocean ───────────────────────────────
    this.slab({ minX: -120, maxX: 120, minZ: -120, maxZ: 10 }, STAIR_HOLE, 0, 0.3, M.ground);
    this.solid([242, 8, 1], [0, 4, -120.5], undefined, false);
    this.solid([1, 8, 132], [-120.5, 4, -55], undefined, false);
    this.solid([1, 8, 132], [120.5, 4, -55], undefined, false);
    this.box([240, 30, 10], [0, -15.3, 5], M.rock, { castShadow: false, map: false });

    // Cliff-edge glass railing (with a gap for the deck).
    for (const [x0, x1] of [
      [-120, -8],
      [8, 120],
    ]) {
      const cx = (x0 + x1) / 2;
      const len = x1 - x0;
      this.box([len, 1.1, 0.06], [cx, 0.55, 9.8], M.glass, { castShadow: false });
      this.box([len, 0.06, 0.1], [cx, 1.12, 9.8], M.steel, { castShadow: false });
      this.solid([len, 3, 0.3], [cx, 1.5, 9.8], undefined, 'wall');
    }

    const rockGeo = this.resources.track(new THREE.DodecahedronGeometry(1, 0));
    const boulder = (pos: Vec3, scale: Vec3, rotY: number, collide: boolean) => {
      const m = new THREE.Mesh(rockGeo, M.rock);
      m.position.set(...pos);
      m.scale.set(...scale);
      m.rotation.set(0.3, rotY, 0.2);
      m.castShadow = m.receiveShadow = true;
      this.add(m);
      if (collide) this.solidCylinder(Math.min(scale[0], scale[2]) * 0.85, scale[1] * 2, [pos[0], scale[1], pos[2]]);
    };
    for (let i = 0; i < 12; i++) boulder([-110 + i * 20 + (i % 3) * 4, -27, 12 + (i % 4) * 3], [9, 7, 8], i, false);
    for (const [x, z, s] of [
      [-60, -30, 6],
      [-75, 0, 8],
      [65, -10, 7],
      [80, -45, 9],
      [-45, -70, 7],
      [40, -80, 8],
    ])
      boulder([x, s * 0.4, z], [s, s * 0.8, s * 0.9], x, true);

    const ocean = new Water({
      width: 3200,
      depth: 3200,
      segments: 160,
      deepColor: 0x0b2a40,
      shallowColor: 0x4f8098,
      amplitude: 0.8,
      sunDirection: sky.sunDirection,
      sunColor: 0xffb070,
    });
    ocean.mesh.position.set(0, -30, 0);
    this.add(ocean.mesh);
    this.animate(null, (_dt, t) => ocean.update(t));

    const cypress = treeFactory('cypress', 0x24361f);
    for (const [x, z] of [
      [-40, -25], [-44, -32], [-26, -30], [45, -28], [50, -14], [48, 0], [-50, -10], [-28, 6], [25, -32], [0, -40],
    ]) {
      this.add(cypress([x, 0, z], 1 + ((x * 7) % 5) / 10));
      this.solidCylinder(0.3, 3, [x, 1.5, z]);
    }

    loading.stage(0.45, 'Raising glass walls…');
    this.buildHouse(M, screen);
    this.buildDeck(M);
    loading.stage(0.6, 'Powering up the lab…');
    this.buildLab(M, screen);
    loading.stage(0.75, 'Charging the cars…');
    await this.buildGarage(M, screen);
  }

  private buildHouse(M: Record<string, THREE.Material>, screen: (t: string, w: number, h: number) => THREE.Material): void {
    this.slab({ minX: -20, maxX: 20, minZ: -20, maxZ: 5 }, STAIR_HOLE, 0.02, 0.02, M.floor, false);
    this.mapRect({ minX: -20, maxX: 20, minZ: -20, maxZ: 5 }, 0, 5, 'floor');

    this.box([40.4, 5, 0.4], [0, 2.5, -20], M.concrete, { collider: true });
    this.box([0.4, 6, 12], [20, 3, -14], M.concrete, { collider: true });
    this.box([0.4, 6, 9], [20, 3, 0.5], M.concrete, { collider: true });
    this.box([0.4, 2.5, 4], [20, 4.75, -6], M.concrete);

    const glass = (size: Vec3, pos: Vec3) => this.box(size, pos, M.glass, { collider: true, castShadow: false });
    glass([0.1, 5, 18], [-20, 2.5, -11]);
    glass([0.1, 5, 3], [-20, 2.5, 3.5]);
    this.box([0.1, 1.5, 4], [-20, 4.25, 0], M.glass, { castShadow: false });
    glass([17, 5, 0.1], [-11.5, 2.5, 5]);
    glass([17, 5, 0.1], [11.5, 2.5, 5]);
    this.box([6, 1.5, 0.1], [0, 4.25, 5], M.glass, { castShadow: false });
    for (const x of [-20, -15.75, -11.5, -7.25, -3, 3, 7.25, 11.5, 15.75])
      this.box([0.12, 5, 0.14], [x, 2.5, 5], M.steel, { castShadow: false });
    for (const z of [-20, -15.5, -11, -6.5, -2, 2])
      this.box([0.14, 5, 0.12], [-20, 2.5, z], M.steel, { castShadow: false });

    this.box([46, 0.5, 31], [1, 5.25, -7.5], M.concrete);
    this.box([40, 0.05, 0.3], [0, 4.98, 4.4], M.warm, { castShadow: false });
    this.box([0.3, 0.05, 22], [-19.6, 4.98, -9], M.warm, { castShadow: false });
    this.add(pointLight(0xffe2c0, 30, 24, [0, 4.3, -8]));
    this.add(pointLight(0xffe2c0, 18, 18, [-10, 4.3, -14]));

    // Living room.
    this.box([8, 0.02, 6], [6, 0.035, -6], M.rug, { castShadow: false, map: false });
    this.box([5, 0.45, 1], [6, 0.225, -9.2], M.fabric, { collider: true, map: 'object' });
    this.box([5, 0.5, 0.25], [6, 0.7, -9.6], M.fabric);
    this.box([1, 0.45, 3.5], [2.6, 0.225, -6.5], M.fabric, { collider: true, map: 'object' });
    this.box([0.25, 0.5, 3.5], [2.2, 0.7, -6.5], M.fabric);
    this.cylinder(1.1, 0.4, [6.5, 0.2, -5.5], M.dark, { collider: true, segments: 40 });
    this.cylinder(1.0, 0.02, [6.5, 0.41, -5.5], M.cyan, { segments: 40, castShadow: false });
    this.box([7, 3, 0.05], [6, 2.6, -19.75], screen('PROJECT // HELIOS', 7, 3), { castShadow: false });

    const holo = new THREE.Group();
    holo.position.set(6.5, 1.35, -5.5);
    const ico = new THREE.Mesh(this.resources.track(new THREE.IcosahedronGeometry(0.55, 2)), M.holo);
    const ringGeo = this.resources.track(new THREE.TorusGeometry(0.8, 0.01, 6, 64));
    const r1 = new THREE.Mesh(ringGeo, M.holo);
    const r2 = new THREE.Mesh(ringGeo, M.holo);
    r1.rotation.x = Math.PI / 2;
    r2.rotation.set(0.6, 0, 0.4);
    holo.add(ico, r1, r2);
    this.add(holo);
    this.animate(holo, (_dt, t) => {
      holo.rotation.y = t * 0.5;
      holo.position.y = 1.35 + Math.sin(t * 1.5) * 0.05;
    });

    // Kitchen island.
    this.box([5, 0.95, 1.4], [-6, 0.475, -14], M.floor, { collider: true, map: 'object' });
    this.box([5.2, 0.06, 1.6], [-6, 0.98, -14], M.dark);

    // Glass railings around the stair to the lab.
    this.box([0.06, 1, 12], [-13.85, 0.5, -12], M.glass, { castShadow: false });
    this.box([4.3, 1, 0.06], [-16, 0.5, -18.1], M.glass, { castShadow: false });
    this.box([0.06, 1, 12], [-18.15, 0.5, -12], M.glass, { castShadow: false });
    this.solid([0.2, 3, 12], [-13.85, 1.5, -12]);
    this.solid([4.3, 3, 0.2], [-16, 1.5, -18.1]);
    this.solid([0.2, 3, 12], [-18.15, 1.5, -12]);
  }

  private buildDeck(M: Record<string, THREE.Material>): void {
    this.box([16, 0.3, 8], [0, -0.15, 14], M.deck, { collider: true, map: 'floor' });
    for (const sx of [-1, 1]) {
      this.box([0.06, 1.1, 8], [sx * 8, 0.55, 14], M.glass, { castShadow: false });
      this.solid([0.3, 3, 8], [sx * 8, 1.5, 14]);
      this.box([0.3, 0.3, 9.8], [sx * 5, -3.15, 14], M.steel, { rotation: [-Math.atan2(5.7, 8), 0, 0] });
    }
    this.box([16, 1.1, 0.06], [0, 0.55, 18], M.glass, { castShadow: false });
    this.box([16, 0.06, 0.1], [0, 1.12, 18], M.steel, { castShadow: false });
    this.solid([16.6, 3, 0.3], [0, 1.5, 18]);
    this.box([16, 0.04, 0.12], [0, 0.02, 17.6], M.warm, { castShadow: false });
  }

  private buildLab(M: Record<string, THREE.Material>, screen: (t: string, w: number, h: number) => THREE.Material): void {
    const cx = (LAB.minX + LAB.maxX) / 2;
    const cz = (LAB.minZ + LAB.maxZ) / 2;
    const w = LAB.maxX - LAB.minX;
    const d = LAB.maxZ - LAB.minZ;

    this.stairs({ x: -16, width: 4, zBottom: -18, yBottom: -6, zTop: -6, yTop: 0, steps: 24, material: M.labWall });
    this.box([0.2, 6, 14], [-13.9, -3, -11], M.labWall, { collider: true });
    this.solid([0.2, 6, 14], [-18.1, -3, -11]);

    this.box([w, 0.3, d], [cx, -6.15, cz], M.labFloor, { collider: true, map: false });
    this.mapRect(LAB, -6, -0.3, 'floor');
    this.box([w + 0.4, 6, 0.4], [cx, -3, LAB.minZ - 0.2], M.labWall, { collider: true });
    this.box([w + 0.4, 6, 0.4], [cx, -3, LAB.maxZ + 0.2], M.labWall, { collider: true });
    this.box([0.4, 6, d], [LAB.minX - 0.2, -3, cz], M.labWall, { collider: true });
    this.box([0.4, 6, d], [LAB.maxX + 0.2, -3, cz], M.labWall, { collider: true });
    this.slab(LAB, STAIR_HOLE, -0.32, 0.1, M.labWall, false);
    for (const x of [-10, -4, 2, 8]) this.box([0.25, 0.05, 16], [x, -0.4, cz], M.cyan, { castShadow: false });
    this.add(pointLight(0x7fdcff, 30, 20, [-7, -1.6, -13]));
    this.add(pointLight(0xe8f2ff, 24, 18, [5, -1.6, -14]));

    // Laboratory: benches, screens and the energy core.
    for (const x of [-10, -5]) {
      this.box([4, 0.9, 1.2], [x, -5.55, -21], M.dark, { collider: true, map: 'object' });
      this.box([3.5, 2, 0.05], [x, -3.3, -21.95], screen('CORE TELEMETRY', 3.5, 2), { castShadow: false });
    }
    this.cylinder(1.2, 0.5, [-7, -5.75, -12], M.steel, { collider: true, segments: 32 });
    const core = new THREE.Mesh(this.resources.track(new THREE.SphereGeometry(0.55, 32, 16)), M.core);
    core.position.set(-7, -4.2, -12);
    this.add(core);
    const ringGeo = this.resources.track(new THREE.TorusGeometry(1.0, 0.04, 8, 64));
    const rings = [0, 1, 2].map((i) => {
      const r = new THREE.Mesh(ringGeo, M.cyan);
      r.position.copy(core.position);
      r.scale.setScalar(1 + i * 0.18);
      this.add(r);
      return r;
    });
    this.animate(core, (_dt, t) => {
      core.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      rings.forEach((r, i) => {
        r.userData.dynamic = true;
        r.rotation.set(t * (0.6 + i * 0.3), t * (0.4 + i * 0.2), 0);
      });
    });
    rings.forEach((r) => (r.userData.dynamic = true));

    // Robot workshop: two animated arms and a humanoid frame.
    const arm = (pos: Vec3, phase: number) => {
      this.cylinder(0.55, 0.4, [pos[0], -5.8, pos[2]], M.dark, { collider: true });
      const base = new THREE.Group();
      base.position.set(pos[0], -5.6, pos[2]);
      const seg = this.resources.track(new THREE.BoxGeometry(0.28, 1.6, 0.28));
      const joint = this.resources.track(new THREE.SphereGeometry(0.22, 16, 12));
      const lower = new THREE.Group();
      const l = new THREE.Mesh(seg, M.steel);
      l.position.y = 0.8;
      lower.add(l, new THREE.Mesh(joint, M.dark));
      const upper = new THREE.Group();
      upper.position.y = 1.6;
      const u = new THREE.Mesh(seg, M.steel);
      u.position.y = 0.7;
      u.scale.y = 0.85;
      const tip = new THREE.Mesh(joint, M.cyan);
      tip.position.y = 1.4;
      tip.scale.setScalar(0.6);
      upper.add(u, new THREE.Mesh(joint, M.dark), tip);
      lower.add(upper);
      base.add(lower);
      base.traverse((o) => (o.castShadow = true));
      this.add(base);
      for (const o of [base, lower, upper]) o.userData.dynamic = true;
      this.animate(base, (_dt, t) => {
        base.rotation.y = Math.sin(t * 0.7 + phase) * 1.2;
        lower.rotation.z = 0.4 + Math.sin(t * 1.1 + phase) * 0.35;
        upper.rotation.z = -1.0 + Math.sin(t * 1.6 + phase) * 0.5;
      });
    };
    arm([3, 0, -18], 0);
    arm([8, 0, -10], 2);

    this.cylinder(1.3, 0.2, [6, -5.9, -18.5], M.dark, { collider: true });
    this.box([0.9, 1.1, 0.45], [6, -3.9, -18.5], M.steel);
    this.box([0.6, 0.2, 0.35], [6, -4.6, -18.5], M.dark);
    this.box([0.22, 1.3, 0.22], [5.75, -5.15, -18.5], M.steel);
    this.box([0.22, 1.3, 0.22], [6.25, -5.15, -18.5], M.steel);
    this.box([0.18, 1.1, 0.18], [5.35, -4.0, -18.5], M.steel);
    this.box([0.18, 1.1, 0.18], [6.65, -4.0, -18.5], M.steel);
    const head = new THREE.Mesh(this.resources.track(new THREE.SphereGeometry(0.26, 20, 14)), M.steel);
    head.position.set(6, -3.05, -18.5);
    this.add(head);
    this.box([0.3, 0.06, 0.02], [6, -3.0, -18.24], M.cyan, { castShadow: false });
    this.box([0.1, 2.2, 5], [10, -4.3, -13], M.steel, { castShadow: false });
  }

  private async buildGarage(M: Record<string, THREE.Material>, screen: (t: string, w: number, h: number) => THREE.Material): Promise<void> {
    this.box([20, 0.02, 22], [30, 0.015, -9], M.dark, { castShadow: false, map: false });
    this.mapRect({ minX: 20, maxX: 40, minZ: -20, maxZ: 2 }, 0, 6, 'floor');
    this.box([20.4, 6, 0.4], [30, 3, -20], M.concrete, { collider: true });
    this.box([0.4, 6, 22.4], [40, 3, -9], M.concrete, { collider: true });
    this.box([4, 6, 0.4], [22, 3, 2], M.concrete, { collider: true });
    this.box([2, 6, 0.4], [39, 3, 2], M.concrete, { collider: true });
    this.box([14, 1, 0.4], [31, 5.5, 2], M.concrete);
    this.box([21, 0.4, 23], [30, 6.2, -9], M.concrete);
    for (const x of [25, 30, 35]) this.box([0.4, 0.05, 18], [x, 5.97, -9], M.white, { castShadow: false });
    this.add(pointLight(0xe6f0ff, 35, 26, [30, 5.2, -9]));
    this.box([8, 2.5, 0.05], [30, 3, -19.75], screen('FLEET STATUS', 8, 2.5), { castShadow: false });

    const ringGeo = this.resources.track(new THREE.TorusGeometry(2.4, 0.035, 8, 72));
    const colors = [0x9b1c24, 0xb8bec6, 0xf2f2f2];
    for (const [i, x] of [24.5, 30, 35.5].entries()) {
      const z = -13;
      this.cylinder(2.4, 0.12, [x, 0.06, z], M.dark, { segments: 48 });
      const ring = new THREE.Mesh(ringGeo, M.cyan);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.13, z);
      this.add(ring);
      this.solidCylinder(2.3, 1.6, [x, 0.8, z]);

      const car = await this.ctx.sceneLoader.loadOptional(`cliff/concept-car-${i + 1}.glb`, () => buildConceptCar(colors[i]));
      const turntable = new THREE.Group();
      turntable.position.set(x, 0.12, z);
      turntable.add(car);
      this.add(turntable);
      this.animate(turntable, (_dt, t) => (turntable.rotation.y = t * 0.25 + i * 2));
    }
  }
}
