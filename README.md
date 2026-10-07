# CineWalk

> **Walk into another world.** — 브라우저에서 실제 여행지와 영화적 공간을 걸어다니는 경량 3D 탐험 플랫폼

**▶ 바로 체험:** https://jngbnss.github.io/CineWalk/
(직접 입장 링크: [Jazz Mansion](https://jngbnss.github.io/CineWalk/?world=jazz-mansion) · [Futuristic Cliff House](https://jngbnss.github.io/CineWalk/?world=futuristic-cliff))

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
```

---

## Project Overview

CineWalk는 **Vite + TypeScript + Three.js + Rapier** 기반의 1인칭 3D 탐험 엔진입니다.
장기 목표는 초실사 유럽 여행지, Gaussian Splatting으로 만든 실제 공간, 영화에서 영감을 받은 가상 공간을
FPS 게임처럼 걸어다니며 AI 가이드와 대화하는 것입니다.

현재 단계(v0.1)는 **"실제로 걸어다닐 수 있는 확장 가능한 프로토타입"** 입니다.
외부 3D 에셋이 하나도 없어도 실행되며(모든 형태·텍스처는 코드로 생성), 이후 glTF·Gaussian Splat·3D Tiles를
같은 인터페이스로 끼워 넣을 수 있게 설계했습니다.

## Demo

| World | 분위기 | 탐험 포인트 (POI) |
|---|---|---|
| **Jazz Mansion** — *"Step into a glamorous 1920s-inspired mansion."* | 1920년대 아르데코 대저택, 달밤, 재즈 파티 | Grand Ballroom · Grand Staircase(2층 갤러리) · Library · Moonlit Pool · Formal Garden · Motor Court |
| **Futuristic Cliff House** — *"Explore a futuristic inventor's home above the ocean."* | 바다 절벽 위 유리 저택, 해질녘 | Living Room · Ocean Deck · Garage(턴테이블 컨셉카) · 지하 Laboratory · Robot Workshop |

두 세계 모두 특정 영화 세트(The Great Gatsby, Iron Man 등)를 복제하지 않은 **독자적인 디자인**입니다.

데모 동선: 월드 선택 → Jazz Mansion 입장 → WASD 이동 → POI 발견(금색 마커) → 정원 동쪽 보라색 포털 → **Travel to Futuristic Cliff House? → YES** → 페이지 새로고침 없이 월드 교체 (돌아오는 주황 포털은 절벽 저택 서쪽).

## Controls

| 키 | 동작 |
|---|---|
| `W` `A` `S` `D` | 이동 |
| Mouse | 시점 회전 (화면 클릭 시 Pointer Lock) |
| `Shift` | 달리기 |
| `Space` | 점프 |
| `Enter` | AI 가이드에게 질문 (빈 Enter로 닫기) |
| `Esc` | Pointer Lock 해제 + 메뉴 |
| `P` | 성능 패널 상세 토글 |
| `` ` `` | lil-gui 디버그 패널 (또는 URL에 `?debug`) |

포털 대화상자: `Enter`/`Y` = 이동, `N`/`Esc` = 머무르기.

## Architecture

```
src/
├─ core/            Engine(상태머신·루프) · Renderer · Camera · InputManager
│                   WorldManager · AssetLoader · SceneLoader · SceneSource
│                   ResourceManager · LoadingManager · LOD · PerformanceMonitor
├─ physics/         Rapier 지연 로딩 · PhysicsWorld(월드당 1개, 언로드 시 free)
├─ player/          FirstPersonController(WASD/마우스) · PlayerPhysics(Rapier KCC 캡슐)
├─ worlds/          World(기반 클래스 + 메시/콜라이더 헬퍼) · registry
│                   JazzMansionWorld · FuturisticCliffWorld · props/(차량, LOD 나무)
├─ environment/     Sky(야간 돔·대기산란) · Lighting · Ocean(Water 셰이더) · ProceduralTextures
├─ poi/             POI 데이터 · POIManager(근접 감지·방문 기록)
├─ portal/          PortalVisual · PortalManager(진입 감지·재무장)
├─ ai/              GuideService 인터페이스 · MockGuideService · OpenAICompatibleGuideService
├─ ui/              WorldSelector · HUD · MiniMap(MapView) · GuidePanel · PerformancePanel · Dialogs · DebugGUI
├─ splat/           GaussianSplatSource · GaussianSplatRenderer(.splat 파서 + 포인트클라우드 미리보기)
└─ main.ts
```

**핵심 계약 (교체 가능한 경계)**

| 계층 | 인터페이스 | 현재 구현 | 향후 구현 |
|---|---|---|---|
| World | `World` + `WorldInfo` (`worlds/World.ts`) | 프리미티브 기반 2개 월드 | ParisWorld, VeniceWorld, GaussianSplatWorld… |
| Asset | `SceneSource { load(); dispose() }` | `GLTFSceneSource`, `ProceduralSceneSource` | `GaussianSplatSource`, `CesiumSceneSource` |
| Physics | `PhysicsWorld` | Rapier 정적 콜라이더 + Kinematic Character Controller | 동적 오브젝트, 트리거 볼륨 |
| Player | `FirstPersonController` | 데스크톱 FPS | WebXR 컨트롤러, 모바일 조이스틱 |
| AI Guide | `GuideService.ask(worldId, poiId, question)` | Mock(키워드 기반, POI 데이터에 근거) | Ollama/OpenAI 호환 API, 스트리밍, 음성 |
| Map | `MapView` | 캔버스 미니맵(플레이어 중심) | MapLibre GL + OpenStreetMap |
| Renderer | `Renderer` | WebGL2, ACES 톤매핑, 그림자, PMREM 환경맵 | WebGPU, 포스트프로세싱 |

**월드 생명주기**: `WorldManager.load(id)` → 이전 월드 `dispose()`(geometry/material/texture/셰이더 유니폼 텍스처까지 순회 해제) → Rapier 월드 `free()` → 새 PhysicsWorld 생성 → `World.build()` → 정적 객체 `matrixAutoUpdate=false` 고정 → 셰이더 `compileAsync` 선컴파일.
월드를 나가면 `renderer.info.memory.geometries`가 0으로 돌아가는 것을 E2E 테스트로 확인했습니다.

**새 월드 추가하기**

```ts
// src/worlds/ParisWorld.ts
export const parisInfo: WorldInfo = { id: 'paris', name: 'Paris', tagline: '…', spawn, bounds, pois: [...], portals: [...], … };
export class ParisWorld extends World {
  readonly info = parisInfo;
  protected async build(ctx: WorldContext) {
    this.slab(this.info.bounds, null, 0, 1, this.std({ color: 0x888888 }));        // 바닥 + 콜라이더
    this.box([10, 20, 10], [0, 10, -30], this.std({ color: 0xccbbaa }), { collider: true });
    const tower = await ctx.sceneLoader.loadOptional('paris/tower.glb', () => fallbackMesh());
    this.add(tower);
  }
}
// src/worlds/registry.ts 에 { info: parisInfo, create: () => new ParisWorld() } 한 줄 추가
```

## Future Open Source Integration

| 프로젝트 | 역할 | 연결 지점 |
|---|---|---|
| **COLMAP** | 사진/영상 → 카메라 포즈 + 희소 포인트클라우드(SfM) | 오프라인 파이프라인 1단계 |
| **Nerfstudio** (`ns-train splatfacto`) | COLMAP 결과로 Gaussian Splat 학습 | 파이프라인 2단계 → `.ply` |
| **gsplat** | Nerfstudio가 쓰는 CUDA 래스터라이저 / 직접 학습 스크립트 | 파이프라인 2단계 대안 |
| **SuperSplat** | 브라우저 기반 splat 편집기: 잡음 제거, 크롭, 압축(`.splat`/`.ply`/`.sog`) | 파이프라인 3단계 → `public/assets/splats/` |
| **Gaussian Splat 웹 렌더러** (예: `@mkkellogg/gaussian-splats-3d`, Spark) | 정렬·알파블렌딩된 실제 splat 렌더링 | `GaussianSplatRenderer` 구현체로 감싸기 |
| **PlayCanvas** | SuperSplat/PlayCanvas 뷰어로 내보낸 장면 참고, 또는 대체 렌더러 실험 | `SceneSource` 구현 |
| **CesiumJS / 3D Tiles** | 실제 도시 지형·건물(Google Photorealistic 3D Tiles 등) | `CesiumSceneSource`(3d-tiles-renderer로 Three.js에 직접 로드) |
| **MapLibre GL + OpenStreetMap** | 실제 지도 미니맵, 장소 검색, 텔레포트 | `MapView` 구현체 — 월드별 지리 앵커로 m ↔ 위경도 변환 |
| **Ollama** | 로컬 LLM 가이드 | `OpenAICompatibleGuideService` (이미 포함, `.env`로 활성화) |
| **whisper.cpp** (WASM/서버) | 음성 명령 → 텍스트 | GuidePanel 입력 소스 추가 ("Take me to the pool") |
| **Piper TTS** | 가이드 답변 음성 출력 | `GuideService` 응답 후처리 |
| **WebRTC / Colyseus** | 멀티플레이: 위치·회전 동기화, 음성 채팅 | Engine 루프에 `NetworkSync` 시스템 추가, 원격 플레이어는 kinematic 캡슐 |
| **WebXR** | VR 헤드셋 탐험 | `renderer.xr.enabled = true` + XR 컨트롤러용 Player 구현 |

### Gaussian Splat 파이프라인

```
사진/영상 ─▶ COLMAP (SfM, 카메라 포즈)
         ─▶ Nerfstudio splatfacto / gsplat (학습 → .ply)
         ─▶ SuperSplat (정리·크롭·압축 → .splat)
         ─▶ public/assets/splats/<place>.splat
         ─▶ GaussianSplatSource ─▶ GaussianSplatRenderer ─▶ CineWalk World
```

```ts
const splat = await ctx.sceneLoader.load(
  new GaussianSplatSource(`${import.meta.env.BASE_URL}assets/splats/vienna.splat`),
  new GLTFSceneSource(ctx.assets, 'vienna/proxy.glb'), // 실패 시 대체
);
```

Splat에는 충돌 정보가 없으므로, 같은 COLMAP 재구성에서 뽑은 **저폴리 프록시 메시**로 Rapier 콜라이더를 만드는 방식을 권장합니다.
기본 제공 `PointCloudSplatRenderer`는 splat 중심점을 색 점으로 보여주는 미리보기(배치·스케일 확인용)입니다.

### AI Guide를 실제 LLM에 연결

```bash
cp .env.example .env.local
# VITE_GUIDE_PROVIDER=openai
# VITE_GUIDE_BASE_URL=http://localhost:11434   (Ollama)
# VITE_GUIDE_MODEL=llama3.2
ollama serve   # OLLAMA_ORIGINS=* 로 브라우저 CORS 허용
npm run dev
```

가이드는 현재 월드 요약과 POI의 `description / facts / story`를 시스템 프롬프트로 받아 답합니다.
실패하면 자동으로 Mock 가이드로 대체됩니다. **프로덕션에서는 API 키를 브라우저에 넣지 말고 서버 프록시를 두세요.**

## Performance

목표: Desktop Chrome, 1920×1080, 60 FPS.

- **좌상단 성능 패널** — FPS, Frame time(+구간 내 최대 CPU 프레임), Draw calls, Triangles, GPU Geometries/Textures, Loaded assets, Colliders, Player position. `renderer.info` 기반, 0.5초 창 평균. `P`로 상세 토글.
- **`PerformanceMonitor`** — `snapshot`, `subscribe()`, `toPrometheus()`(텍스트 노출 포맷).
  디버그 패널의 *copy Prometheus metrics* 버튼으로 복사할 수 있고, Pushgateway/beacon 엔드포인트로 보내면 Grafana 대시보드에 바로 연결됩니다.
- 현재 수치(1280×720 기준): Jazz Mansion 약 200–330 draw calls / 15–25k triangles, Cliff House 약 150–350 draw calls / 60–80k triangles (바다 메시 포함).

적용된 최적화

| 항목 | 구현 |
|---|---|
| 초기 로딩 | 타이틀 화면은 즉시 표시, Rapier WASM(약 1.7MB gzip)은 백그라운드 동적 import, lil-gui는 필요할 때만 로드 |
| Lazy loading | 월드 지오메트리·물리는 입장할 때만 생성. glTF는 `manifest.json`에 등록된 것만 요청(404 없음) |
| Asset cache | `AssetLoader`가 URL별 Promise 캐시, 월드 전환 시 정리 |
| Dispose | `ResourceManager.disposeObject()`가 geometry/material/texture/ShaderMaterial 유니폼 텍스처/섀도맵 해제, Rapier 월드 `free()`, `renderLists.dispose()` |
| CPU | 정적 객체 `matrixAutoUpdate=false`, 동일 크기 박스 geometry 공유, 샹들리에 크리스털은 `InstancedMesh` |
| GPU | Pixel ratio 상한 1.5, 섀도 캐스터는 방향광 1개(2048²), 점광원은 월드당 8개 이하, 셰이더 `compileAsync` 선컴파일 |
| LOD | `createLOD({ high, medium, low })`, 기본 거리 0/22/55m, 전역 `lodSettings.bias`. 샹들리에·나무에 적용 |
| Frustum culling | Three.js 기본값 사용 |
| 텍스처 압축 | `AssetLoader.gltf`에 `setKTX2Loader()` / `setDRACOLoader()` / `setMeshoptDecoder()`를 연결할 수 있는 구조 (gltf-transform으로 사전 압축 권장) |

## Asset License

현재 버전은 **외부 에셋을 사용하지 않습니다.** 모든 지오메트리와 텍스처는 코드로 생성되며 이 저장소와 같은 라이선스를 따릅니다.
glTF를 추가하려면 `public/assets/`에 파일을 넣고 `public/assets/manifest.json`에 등록한 뒤 아래 표에 기록하세요.
(자리 표시용 키: `jazz/classic-car.glb`, `cliff/concept-car-1.glb` ~ `-3.glb`)

```json
{ "assets": [
  { "path": "jazz/classic-car.glb", "title": "…", "author": "…", "source": "https://…", "license": "CC0-1.0" }
] }
```

| Asset | 사용 위치 | 출처 | 작성자 | License |
|---|---|---|---|---|
| Procedural geometry & textures | 모든 월드 | 이 저장소 | CineWalk contributors | 저장소 라이선스 |
| Inter, Cormorant Garamond | UI 폰트 | Google Fonts | Rasmus Andersson / Christian Thalmann | SIL OFL 1.1 |
| *(예시)* | | | | |

권장 무료 에셋 소스 (모두 CC0 중심)

| 소스 | 용도 |
|---|---|
| [Poly Haven](https://polyhaven.com) | HDRI 하늘, PBR 텍스처, 고품질 모델 (CC0) |
| [ambientCG](https://ambientcg.com) | 대리석·콘크리트·나무 등 PBR 머티리얼 (CC0) |
| [Kenney](https://kenney.nl/assets) | 로우폴리 가구·차량·소품 (CC0) |
| [Quaternius](https://quaternius.com) | 로우폴리 캐릭터·차량·자연물 (CC0) |

---

## Deploy

`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 `gh-pages` 브랜치로 배포합니다.
`vite.config.ts`의 `base: './'` 덕분에 어떤 하위 경로(GitHub Pages, S3, itch.io)에서도 그대로 동작합니다.
