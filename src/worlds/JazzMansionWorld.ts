import * as THREE from 'three';
import { createLOD, LODLevel } from '../core/LOD';
import { createNightLighting, pointLight } from '../environment/Lighting';
import { Water } from '../environment/Ocean';
import { artDeco, books, grass, marbleChecker, wood } from '../environment/ProceduralTextures';
import { createNightSky } from '../environment/Sky';
import { treeFactory } from './props/Trees';
import { buildClassicCar } from './props/Vehicles';
import { World, type Rect, type Vec3, type WorldContext, type WorldInfo } from './World';

export const jazzMansionInfo: WorldInfo = {
  id: 'jazz-mansion',
  name: 'Jazz Mansion',
  tagline: 'Step into a glamorous 1920s-inspired mansion.',
  summary:
    'An original Jazz Age estate on a moonlit night: a marble ballroom under crystal chandeliers, a grand staircase, ' +
    'a hidden library, a glowing pool and a formal garden. The band is warming up and the champagne is already poured.',
  cardArt:
    'radial-gradient(120% 90% at 50% 110%, rgba(243,201,107,.55), transparent 60%), linear-gradient(160deg,#0d1424 0%,#1b1530 55%,#3a2410 100%)',
  accent: '#f3c96b',
  spawn: { position: [0, 0, 4], yaw: 0 },
  bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 },
  pois: [
    {
      id: 'ballroom',
      name: 'Grand Ballroom',
      description: "A massive hall prepared for tonight's party.",
      position: [8, 0, -10],
      radius: 4,
      facts: [
        'The checkerboard floor is laid in alternating Carrara-style white and Belgian-black marble.',
        'Three crystal chandeliers hang twelve metres up; each is wired with its own dimmer for the dancing.',
        'The bandstand on the east wall holds a grand piano, an upright bass and a drum kit.',
      ],
      story:
        'Legend says the host never once danced at his own parties — he watched from the gallery above, waiting for one particular guest to arrive.',
    },
    {
      id: 'grand-staircase',
      name: 'Grand Staircase',
      description: 'Twenty carpeted steps sweep up to a gilded gallery.',
      position: [0, 0, -12],
      radius: 3.2,
      facts: [
        'The stair rises five metres to the gallery over twenty shallow steps — made for slow, dramatic entrances.',
        'The gallery railing is gilded brass, polished every morning before guests arrive.',
      ],
      story: 'Every evening the host appears at the top of these stairs at exactly midnight, raises a glass, and disappears again.',
    },
    {
      id: 'library',
      name: 'Library',
      description: 'Oak, leather and first editions — the quietest room in the house.',
      position: [-15, 0, -23],
      radius: 3.5,
      facts: [
        'Floor-to-ceiling shelves cover two walls; many of the books have never been opened.',
        'A brass globe in the corner still shows the borders of 1922.',
      ],
      story: 'A guest once remarked that the books were real — and was astonished to find the pages uncut.',
    },
    {
      id: 'pool',
      name: 'Moonlit Pool',
      description: 'A marble-rimmed pool glowing turquoise under the stars.',
      position: [0, 0, 11.5],
      radius: 3.5,
      facts: [
        'Underwater lamps make the pool glow after dark.',
        'Shallow steps at the near end let guests wade in, champagne in hand.',
      ],
      story: 'At the end of summer the pool is drained — but tonight it is full, and someone has left a floating mattress drifting in the dark.',
    },
    {
      id: 'garden',
      name: 'Formal Garden',
      description: 'Clipped hedges frame a gilded fountain.',
      position: [-28, 0, 22],
      radius: 6,
      facts: [
        'The hedges form a square parterre with an opening on each side.',
        'The fountain bowl is gilded; at night it reflects the lamps along the path.',
      ],
      story: 'Couples slip out here when the ballroom gets too loud — the fountain hides any conversation.',
    },
    {
      id: 'motor-court',
      name: 'Motor Court',
      description: 'A cream roadster waits on the gravel, chrome catching the lamplight.',
      position: [16, 0, 13],
      radius: 3.5,
      facts: ['The roadster is a fictional 1920s-style design: long hood, running boards and whitewall tyres.'],
      story: 'The car is said to belong to the host, though nobody has ever seen him drive it.',
    },
  ],
  portals: [
    {
      id: 'to-cliff',
      targetWorldId: 'futuristic-cliff',
      label: 'Futuristic Cliff House',
      position: [30, 0, 26],
      radius: 2.2,
      color: 0x8a6cff,
      facing: -2.2,
    },
  ],
};

const POOL: Rect = { minX: -6, maxX: 6, minZ: 14, maxZ: 30 };

export class JazzMansionWorld extends World {
  readonly info = jazzMansionInfo;

  protected async build(ctx: WorldContext): Promise<void> {
    const { scene, renderer, loading } = ctx;

    // ── Environment ─────────────────────────────────────────
    const sky = createNightSky();
    this.add(sky.object);
    this.add(createNightLighting(sky.moonDirection).object);
    scene.fog = new THREE.FogExp2(0x0b1226, 0.011);
    scene.environment = renderer.environment;
    scene.environmentIntensity = 0.22;
    renderer.three.toneMappingExposure = 0.95;
    loading.stage(0.25, 'Polishing marble…');

    const M = {
      marble: this.std({ map: this.tex(marbleChecker()), roughness: 0.16, metalness: 0.05 }),
      stucco: this.std({ color: 0xcbbfa6, roughness: 0.92 }),
      deco: this.std({ map: this.tex(artDeco()), roughness: 0.65, metalness: 0.2 }),
      gold: this.std({ color: 0xd4af37, metalness: 1, roughness: 0.28 }),
      lacquer: this.std({ color: 0x0c0c0c, roughness: 0.15, metalness: 0.2 }),
      carpet: this.std({ color: 0x6e0f1c, roughness: 0.95 }),
      grass: this.std({ map: this.tex(grass()), roughness: 1 }),
      hedge: this.std({ color: 0x1d3a1f, roughness: 0.95 }),
      stone: this.std({ color: 0xb9b1a2, roughness: 0.85 }),
      gravel: this.std({ color: 0x8c8478, roughness: 1 }),
      window: this.std({ color: 0x1a1208, emissive: 0xffbf66, emissiveIntensity: 1.4 }),
      wood: this.std({ map: this.tex(wood()), roughness: 0.6 }),
      books: this.std({ map: this.tex(books()), roughness: 0.8 }),
      linen: this.std({ color: 0xf2ece0, roughness: 0.9 }),
      tile: this.std({ color: 0x2f8f9a, roughness: 0.35 }),
      crystal: this.std({ color: 0xfff3d6, emissive: 0xffd28a, emissiveIntensity: 2.4, roughness: 0.1 }),
      bulb: this.std({ color: 0xfff1cc, emissive: 0xffd28a, emissiveIntensity: 3 }),
      iron: this.std({ color: 0x15151a, metalness: 0.7, roughness: 0.5 }),
    };

    // ── Ground & boundary ───────────────────────────────────
    this.slab(this.info.bounds, POOL, 0, 1, M.grass);
    this.solid([122, 8, 1], [0, 4, -60.5], undefined, false);
    this.solid([122, 8, 1], [0, 4, 60.5], undefined, false);
    this.solid([1, 8, 122], [-60.5, 4, 0], undefined, false);
    this.solid([1, 8, 122], [60.5, 4, 0], undefined, false);

    this.buildMansionShell(M);
    loading.stage(0.45, 'Hanging chandeliers…');
    this.buildBallroom(M);
    this.buildLibrary(M);
    loading.stage(0.65, 'Filling the pool…');
    this.buildPool(M, sky.moonDirection);
    this.buildGarden(M);
    loading.stage(0.8, 'Parking the roadster…');

    const car = await ctx.sceneLoader.loadOptional('jazz/classic-car.glb', buildClassicCar);
    car.position.set(16, 0, 8);
    car.rotation.y = 0.35;
    this.add(car);
    this.solid([2.1, 1.6, 5.1], [16, 0.8, 8], [0, 0.35, 0], 'object');
  }

  private buildMansionShell(M: Record<string, THREE.Material>): void {
    const H = 12;
    const T = 0.5;
    const wall = (size: Vec3, pos: Vec3) => this.box(size, pos, M.stucco, { collider: true });

    this.box([39.5, 0.02, 23.5], [0, 0.01, -18], M.marble, { castShadow: false, map: false });
    this.mapRect({ minX: -20, maxX: 20, minZ: -30, maxZ: -6 }, 0, H, 'floor');

    wall([40 + T, H, T], [0, H / 2, -30]);
    wall([T, H, 24], [-20, H / 2, -18]);
    wall([T, H, 24], [20, H / 2, -18]);
    wall([17, H, T], [-11.5, H / 2, -6]);
    wall([17, H, T], [11.5, H / 2, -6]);
    this.box([6, H - 4.5, T], [0, 4.5 + (H - 4.5) / 2, -6], M.stucco); // lintel over the 4.5 m doorway

    // Interior art-deco panelling and gilded crown.
    this.box([39, 11.5, 0.05], [0, 6, -29.72], M.deco, { castShadow: false });
    this.box([0.05, 11.5, 23], [-19.72, 6, -18], M.deco, { castShadow: false });
    this.box([0.05, 11.5, 23], [19.72, 6, -18], M.deco, { castShadow: false });
    this.box([16.5, 11.5, 0.05], [-11.75, 6, -6.28], M.deco, { castShadow: false });
    this.box([16.5, 11.5, 0.05], [11.75, 6, -6.28], M.deco, { castShadow: false });
    this.box([39, 0.3, 0.12], [0, 11.6, -29.65], M.gold);
    this.box([0.12, 0.3, 23], [-19.65, 11.6, -18], M.gold);
    this.box([0.12, 0.3, 23], [19.65, 11.6, -18], M.gold);

    // Ceiling + roof (casts the moon shadow that keeps the hall dark and moody).
    this.box([40.5, 0.4, 24.5], [0, 12.2, -18], M.stucco);
    this.box([41.5, 0.7, 25.5], [0, 12.75, -18], M.stone);
    this.box([41.6, 0.25, 0.3], [0, 12.2, -5.6], M.gold);

    // Portico, columns and doorway trim.
    for (const x of [-4.4, 4.4]) {
      this.cylinder(0.42, 9, [x, 4.5, -4.6], M.stucco, { collider: true });
      this.cylinder(0.6, 0.3, [x, 0.15, -4.6], M.gold);
      this.cylinder(0.6, 0.3, [x, 8.85, -4.6], M.gold);
    }
    this.box([10.4, 0.6, 3.4], [0, 9.3, -4.4], M.stone);
    this.box([10.5, 0.15, 3.5], [0, 8.95, -4.4], M.gold);
    this.box([0.3, 4.6, 0.7], [-3.15, 2.3, -6], M.gold);
    this.box([0.3, 4.6, 0.7], [3.15, 2.3, -6], M.gold);
    this.box([6.6, 0.3, 0.7], [0, 4.6, -6], M.gold);

    // Glowing windows (visual only).
    for (const x of [-17, -13.5, -9.5, 9.5, 13.5, 17])
      for (const y of [2.6, 8.2]) this.box([1.8, 3.2, 0.08], [x, y, -5.72], M.window, { castShadow: false });
    for (const sx of [-1, 1])
      for (const z of [-10, -16, -22, -27])
        for (const y of [2.6, 8.2]) this.box([0.08, 3.2, 1.8], [sx * 20.28, y, z], M.window, { castShadow: false });

    // Front terrace and path towards the pool.
    this.box([20, 0.02, 6], [0, 0.012, -3], M.stone, { castShadow: false, map: false });
    this.box([4, 0.02, 8], [0, 0.012, 4], M.stone, { castShadow: false, map: false });
    this.box([5, 0.02, 44], [16, 0.012, 18], M.gravel, { castShadow: false, map: false });
  }

  private buildBallroom(M: Record<string, THREE.Material>): void {
    // Gallery (mezzanine) + railing.
    this.box([20, 0.3, 6], [0, 4.85, -27], M.marble, { collider: true, map: false });
    this.mapRect({ minX: -10, maxX: 10, minZ: -30, maxZ: -24 }, 4.9, 5.1, 'floor');
    this.box([7, 1, 0.12], [-6.5, 5.5, -24], M.gold, { collider: true });
    this.box([7, 1, 0.12], [6.5, 5.5, -24], M.gold, { collider: true });
    this.box([0.12, 1, 6], [-10, 5.5, -27], M.gold, { collider: true });
    this.box([0.12, 1, 6], [10, 5.5, -27], M.gold, { collider: true });

    // Grand staircase with gilded stringers and handrails.
    this.stairs({ x: 0, width: 6, zBottom: -14, yBottom: 0, zTop: -24, yTop: 5, steps: 20, material: M.carpet });
    const slope = Math.atan2(5, 10);
    const len = Math.hypot(5, 10);
    for (const sx of [-1, 1]) {
      this.box([0.2, 0.45, len], [sx * 3.1, 2.6, -19], M.gold, { rotation: [slope, 0, 0] });
      this.box([0.1, 0.1, len], [sx * 3.1, 3.55, -19], M.gold, { rotation: [slope, 0, 0] });
    }

    // Columns.
    for (const x of [-16, 16])
      for (const z of [-11, -17, -23]) {
        this.cylinder(0.5, 12, [x, 6, z], M.stucco, { collider: true });
        this.cylinder(0.68, 0.4, [x, 0.2, z], M.gold);
        this.cylinder(0.68, 0.4, [x, 11.8, z], M.gold);
      }

    // Chandeliers with LOD (crystals are one instanced draw call per chandelier).
    const crystalGeo = this.resources.track(new THREE.OctahedronGeometry(0.09, 0));
    const ringGeo = this.resources.track(new THREE.TorusGeometry(1.2, 0.05, 8, 48));
    const innerGeo = this.resources.track(new THREE.TorusGeometry(0.7, 0.04, 8, 32));
    const coreGeo = this.resources.track(new THREE.SphereGeometry(0.35, 16, 12));
    const coreLowGeo = this.resources.track(new THREE.SphereGeometry(0.6, 8, 6));
    const chainGeo = this.resources.track(new THREE.CylinderGeometry(0.03, 0.03, 1, 6));
    const chandelier = (pos: Vec3) => {
      const high = new THREE.Group();
      const ring = new THREE.Mesh(ringGeo, M.gold);
      ring.rotation.x = Math.PI / 2;
      const inner = new THREE.Mesh(innerGeo, M.gold);
      inner.rotation.x = Math.PI / 2;
      inner.position.y = 0.4;
      const crystals = new THREE.InstancedMesh(crystalGeo, M.crystal, 36);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 36; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r = i < 24 ? 1.2 : 0.7;
        const y = i < 24 ? -0.35 - (i % 3) * 0.12 : 0.1;
        crystals.setMatrixAt(i, m.makeTranslation(Math.cos(a * (i < 24 ? 1 : 2)) * r, y, Math.sin(a * (i < 24 ? 1 : 2)) * r));
      }
      high.add(ring, inner, crystals, new THREE.Mesh(coreGeo, M.crystal));
      const medium = new THREE.Group();
      const ring2 = new THREE.Mesh(ringGeo, M.gold);
      ring2.rotation.x = Math.PI / 2;
      medium.add(ring2, new THREE.Mesh(coreGeo, M.crystal));
      const lod = createLOD({
        [LODLevel.HIGH]: high,
        [LODLevel.MEDIUM]: medium,
        [LODLevel.LOW]: new THREE.Mesh(coreLowGeo, M.crystal),
      });
      lod.position.set(...pos);
      this.add(lod);
      const chainLen = 12 - pos[1];
      const chain = new THREE.Mesh(chainGeo, M.gold);
      chain.scale.y = chainLen;
      chain.position.set(pos[0], pos[1] + chainLen / 2, pos[2]);
      this.add(chain);
    };
    chandelier([-8, 9.2, -13]);
    chandelier([8, 9.2, -13]);
    chandelier([0, 9.8, -19.5]);
    this.add(pointLight(0xffd29a, 70, 30, [-8, 8.4, -13]));
    this.add(pointLight(0xffd29a, 70, 30, [8, 8.4, -13]));

    // Bandstand.
    this.box([7, 0.35, 9], [15.5, 0.175, -17], M.lacquer, { collider: true, map: 'object' });
    this.box([0.1, 0.36, 9], [11.98, 0.18, -17], M.gold);
    this.box([7, 7, 0.2], [15.5, 3.85, -21.4], M.carpet);
    this.box([1.5, 0.35, 2], [14.2, 1.15, -19], M.lacquer);
    this.box([1.2, 0.62, 1.6], [14.2, 0.66, -19], M.lacquer);
    this.box([1.5, 0.04, 2], [14.55, 1.75, -19.1], M.lacquer, { rotation: [0, 0, -0.6] });
    this.box([0.5, 1.3, 0.25], [16.8, 1.0, -16], M.wood);
    this.box([0.08, 0.9, 0.06], [16.8, 2.1, -16], M.wood);
    this.cylinder(0.35, 0.3, [17.6, 0.55, -18.6], M.linen);
    this.cylinder(0.25, 0.25, [17.1, 0.85, -19.3], M.linen);
    this.cylinder(0.02, 1.6, [13.4, 1.15, -14.6], M.iron);
    this.add(pointLight(0xff9fc0, 28, 16, [15, 4.8, -15]));

    // Tables, candles and a champagne tower.
    for (const [x, z] of [
      [-13, -10],
      [-7, -9.5],
      [-12.5, -14.5],
      [-6.5, -14],
    ]) {
      this.cylinder(0.9, 0.75, [x, 0.375, z], M.linen, { collider: true });
      this.cylinder(0.04, 0.22, [x, 0.86, z], M.bulb, { castShadow: false });
    }
    this.cylinder(0.7, 0.9, [5, 0.45, -9], M.linen, { collider: true });
    for (let k = 0; k < 4; k++)
      this.cylinder(0.5 - k * 0.11, 0.2, [5, 1.0 + k * 0.2, -9], M.crystal, { radiusTop: 0.42 - k * 0.11, castShadow: false });
  }

  private buildLibrary(M: Record<string, THREE.Material>): void {
    this.box([0.3, 5, 8], [-10, 2.5, -26], M.wood, { collider: true });
    this.box([0.3, 5, 2], [-10, 2.5, -19], M.wood, { collider: true });
    this.box([0.3, 1.5, 2], [-10, 4.25, -21], M.wood);
    this.box([10, 5, 0.3], [-15, 2.5, -18], M.wood, { collider: true });
    this.box([10, 0.3, 12], [-15, 5.15, -24], M.wood);
    this.box([9.4, 4, 0.6], [-15, 2, -29.4], M.books, { collider: true });
    this.box([0.6, 4, 11], [-19.4, 2, -24], M.books, { collider: true });
    this.box([6, 0.02, 5], [-15, 0.025, -24], M.carpet, { castShadow: false, map: false });
    this.box([3, 0.1, 1.4], [-15, 0.8, -24], M.wood);
    this.box([2.6, 0.75, 1.0], [-15, 0.375, -24], M.wood, { collider: true, map: 'object' });
    this.cylinder(0.05, 0.5, [-14, 1.1, -24], M.gold);
    this.cylinder(0.12, 0.18, [-14, 1.4, -24], M.bulb, { radiusTop: 0.2, castShadow: false });
    this.add(pointLight(0xffc27a, 14, 12, [-15, 2.4, -24]));
    this.cylinder(0.05, 1, [-12, 0.5, -27.5], M.gold);
    const globe = new THREE.Mesh(this.resources.track(new THREE.SphereGeometry(0.4, 24, 16)), this.std({ color: 0x5a6e4a, roughness: 0.5 }));
    globe.position.set(-12, 1.35, -27.5);
    globe.castShadow = true;
    this.add(globe);
    this.animate(globe, (dt) => (globe.rotation.y += dt * 0.2));
  }

  private buildPool(M: Record<string, THREE.Material>, moonDir: THREE.Vector3): void {
    const { minX, maxX, minZ, maxZ } = POOL;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const w = maxX - minX;
    const d = maxZ - minZ;

    this.box([0.3, 2, d + 0.6], [minX - 0.15, -1, cz], M.tile, { collider: true, map: false });
    this.box([0.3, 2, d + 0.6], [maxX + 0.15, -1, cz], M.tile, { collider: true, map: false });
    this.box([w + 0.6, 2, 0.3], [cx, -1, minZ - 0.15], M.tile, { collider: true, map: false });
    this.box([w + 0.6, 2, 0.3], [cx, -1, maxZ + 0.15], M.tile, { collider: true, map: false });
    this.box([w, 0.3, 10], [cx, -1.95, 25], M.tile, { collider: true, map: false });
    this.stairs({ x: cx, width: w, zBottom: 20, yBottom: -1.8, zTop: 14, yTop: -0.3, steps: 6, material: M.tile });

    // Coping.
    this.box([w + 2, 0.06, 1], [cx, 0.03, minZ - 0.5], M.stone, { castShadow: false });
    this.box([w + 2, 0.06, 1], [cx, 0.03, maxZ + 0.5], M.stone, { castShadow: false });
    this.box([1, 0.06, d], [minX - 0.5, 0.03, cz], M.stone, { castShadow: false });
    this.box([1, 0.06, d], [maxX + 0.5, 0.03, cz], M.stone, { castShadow: false });

    const water = new Water({
      width: w,
      depth: d,
      segments: 24,
      deepColor: 0x0b4a5a,
      shallowColor: 0x2fd0e0,
      amplitude: 0.03,
      scale: 6,
      glow: 0.4,
      sunDirection: moonDir,
      sunColor: 0x9fb4ff,
      opacity: 0.85,
    });
    water.mesh.position.set(cx, -0.35, cz);
    this.add(water.mesh);
    this.animate(null, (_dt, t) => water.update(t));
    this.mapRect(POOL, -2, 0, 'water');
    this.add(pointLight(0x40e0ff, 22, 14, [cx, -1.2, cz]));

    for (const sx of [-1, 1])
      for (const z of [17, 22, 27]) this.box([0.8, 0.4, 2], [sx * 8.5, 0.2, z], M.linen, { collider: true, map: 'object' });
  }

  private buildGarden(M: Record<string, THREE.Material>): void {
    // Square parterre around the fountain with an opening on each side.
    const c = { x: -28, z: 22 };
    const half = 14;
    const gap = 1.4;
    const hedge = (size: Vec3, pos: Vec3) => this.box(size, pos, M.hedge, { collider: true });
    const seg = half - gap;
    for (const s of [-1, 1]) {
      for (const t of [-1, 1]) {
        hedge([seg, 1.4, 0.8], [c.x + t * (gap + seg / 2), 0.7, c.z + s * half]);
        hedge([0.8, 1.4, seg], [c.x + s * half, 0.7, c.z + t * (gap + seg / 2)]);
      }
    }
    this.box([2.4, 0.02, half * 2], [c.x, 0.012, c.z], M.gravel, { castShadow: false, map: false });
    this.box([half * 2, 0.02, 2.4], [c.x, 0.012, c.z], M.gravel, { castShadow: false, map: false });

    // Fountain.
    this.cylinder(3, 0.6, [c.x, 0.3, c.z], M.stone, { collider: true, segments: 40 });
    const fountainWater = new Water({ width: 4, depth: 4, segments: 8, deepColor: 0x0b2a3a, shallowColor: 0x6a9ab0, amplitude: 0.02, scale: 10, glow: 0.1 });
    fountainWater.mesh.position.set(c.x, 0.62, c.z);
    this.add(fountainWater.mesh);
    this.animate(null, (_dt, t) => fountainWater.update(t));
    this.cylinder(0.3, 2, [c.x, 1.6, c.z], M.stone);
    this.cylinder(1, 0.3, [c.x, 2.6, c.z], M.gold, { radiusTop: 1.25 });

    // Trees (LOD) around the estate.
    const tree = treeFactory('round', 0x1f3b22);
    const spots: Vec3[] = [
      [-48, 0, 0], [-50, 0, 14], [-49, 0, 30], [-46, 0, 44], [-30, 0, 48], [-12, 0, 46], [8, 0, 48],
      [26, 0, 46], [42, 0, 44], [50, 0, 30], [52, 0, 12], [48, 0, -4], [36, 0, -20], [-36, 0, -20],
      [-30, 0, -40], [30, 0, -40], [0, 0, -45], [-50, 0, -30], [50, 0, -30],
    ];
    spots.forEach((p, i) => {
      this.add(tree(p, 0.9 + ((i * 37) % 10) / 20));
      this.solidCylinder(0.35, 3, [p[0], 1.5, p[2]]);
    });

    // Lamp posts along the paths; two of them carry real lights.
    const lamps: Vec3[] = [
      [-3, 0, 2], [3, 0, 2], [13, 0, 4], [19, 0, 4], [13, 0, 20], [19, 0, 20], [-12.6, 0, 19.8], [-12.6, 0, 24.2],
    ];
    lamps.forEach((p, i) => {
      this.cylinder(0.07, 3.2, [p[0], 1.6, p[2]], M.iron, { collider: true });
      this.cylinder(0.22, 0.4, [p[0], 3.35, p[2]], M.bulb, { castShadow: false });
      if (i === 0 || i === 4) this.add(pointLight(0xffc98a, 18, 16, [p[0], 3.1, p[2]]));
    });
  }
}
