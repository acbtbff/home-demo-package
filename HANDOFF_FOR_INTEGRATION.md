# Integration Handoff — home-demo-package

## 0. Handoff checkpoint

- Project path: `C:\Users\Lenovo\Projects\home-demo-package`
- Source-of-truth branch at inspection start: `baseline/demo-room-v0`
- Source-of-truth commit at inspection start: `c9a629c8b602edc506a2df088d89bdb5717a8763`
- Remote: `https://github.com/acbtbff/home-demo-package.git`
- Initial Git status: clean; no business changes were present before this handoff document was created.
- This document records the pre-integration boundary. No Furniture/PARAMETRIC/LIBRARY code has been merged here.

## A. Project positioning

`home-demo-package` is the formal product main project and the Source of Truth for the next offline integration. It owns the current production web shell, React Router, RoomDocument v1, floor-plan editing, the shared 2D-to-3D room flow, and the current room-related UI.

The separate `rental-home-demo` experiment is not a replacement project. It is a technical reference for Furniture, Placement, GeometryProxy, SpatialAnalyzer, Collision, and PARAMETRIC/LIBRARY runtime experiments. Integration must be selective and adapter-based.

## B. How to run

The project uses Node.js `>=20.19` and pnpm:

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run build
```

`package.json` identifies the package as `rental-home-demo`, uses ESM (`type: module`), and defines `dev`, `build`, `lint`, `preview`, and optional `vision:server` scripts. The production runtime dependencies are React 19, React DOM 19, React Router DOM 7, Three.js, `@react-three/fiber`, and `@react-three/drei`; Vite, the React Vite plugin, Oxlint, and React type packages are development dependencies. Both `pnpm-lock.yaml` and `package-lock.json` are present.

Additional existing script:

```bash
pnpm run vision:server
```

The Vision server is a future/optional path and requires `OPENAI_API_KEY`; it is not required for the current Room baseline.

## C. Pages and entry structure

React entry:

- `src/main.jsx` creates the React root, wraps the app in `StrictMode`, and creates the `BrowserRouter`.
- `src/App.jsx` mounts `RoomDocumentProvider` and defines the routes.

Routes currently defined in `src/App.jsx`:

| Route | Page | Current role |
|---|---|---|
| `/` | `src/pages/HomePage.jsx` | Product landing page |
| `/floorplan` | `src/pages/FloorPlanPage.jsx` | RoomDocument-backed 2D editor flow |
| `/room` | `src/pages/RoomPage.jsx` | RoomDocument-backed 3D room |
| `/furniture` | `src/pages/FurniturePage.jsx` | Placeholder page; furniture runtime is not integrated |

`src/components/layout/AppLayout.jsx` supplies the shared shell/navigation through the route outlet.

## D. Room / Floorplan architecture

### RoomDocument definition and schema

- Schema constants and serialization: `src/domain/roomSchema.js`
- Runtime validation: `src/domain/roomValidation.js`
- Geometry helpers: `src/domain/roomGeometry.js`
- Wall closure/topology: `src/domain/wallTopology.js`
- Wall snapping: `src/domain/wallSnapping.js`

The current default Demo RoomDocument is:

- `src/data/demoRoomDocument.js` — exports `DEMO_ROOM_DOCUMENT`

Legacy/fallback data remains intact:

- `src/data/initialRoomDocument.js`
- `src/adapters/legacyDemoAdapter.js`

### State creation and Provider

- `src/state/useRoomDocument.js` owns the reducer and `useReducer` state.
- `src/state/RoomDocumentContext.jsx` creates the provider state with `useRoomDocument(DEMO_ROOM_DOCUMENT)`.
- `src/state/roomDocumentContext.js` defines the React context.
- `src/state/useSharedRoomDocument.js` reads the context.

Reducer actions include room resizing, wall default updates, wall edits/moves, wall add/remove, and opening add/update/remove.

### Consumers and editors

- `src/pages/FloorPlanPage.jsx` reads `{ document, dispatch }` from `useSharedRoomDocument()` and passes them to `FloorPlanEditor`.
- `src/components/floorplan/FloorPlanEditor.jsx` reads `document.walls`, `document.openings`, room defaults, and dispatches reducer actions for wall/opening editing.
- `src/pages/RoomPage.jsx` reads the same `{ document, dispatch }`, exposes room/opening controls, and passes `document` to `Room`.

The 2D editor and 3D page do not maintain separate Room copies.

## E. 2D → 3D data flow

```text
DEMO_ROOM_DOCUMENT
  → RoomDocumentProvider
  → useRoomDocument reducer state
  → RoomDocumentContext
  ├─ FloorPlanPage
  │   └─ FloorPlanEditor (edit walls/openings/defaults via dispatch)
  └─ RoomPage
      └─ Room
          └─ WallSegment (render walls/openings)
```

Import-related flow remains present but is currently feature-gated off:

```text
FloorPlanImport
  → floorplanImageParser
  → FloorplanImageDraft
  → floorplanImageDraftToRoomDocument
  → RESET_DOCUMENT
  → shared RoomDocument state
```

`src/config/features.js` currently has `floorplanImport: false`. The import components, parser, adapters, fixtures, and `RESET_DOCUMENT` reducer action remain in the repository.

## F. 3D Scene

- `src/pages/RoomPage.jsx` creates the React Three Fiber `<Canvas>` and configures camera, lights, grid, and `OrbitControls`.
- `src/components/Room.jsx` renders the floor, maps every `document.walls` entry to `WallSegment`, passes wall-bound openings, and owns the 3D resize handles.
- `src/components/WallSegment.jsx` renders wall boxes, splits wall spans around openings, renders window glass, and applies the current facing-wall transparency behavior.

Current architectural facts:

- Units: meters.
- Coordinate system: right-handed; Y up; floor axes X/Z.
- Wall geometry: `start` and `end` points on the X/Z floor plane.
- Openings bind to walls using `wallId`, `offset`, `width`, `height`, and `sillHeight`.
- Floor thickness and wall defaults come from `document.room`.
- Facing-wall transparency is implemented in `WallSegment.jsx` by updating wall material transparency based on camera direction.

## G. Furniture integration points

### Already present in the main project

- `src/pages/FurniturePage.jsx` exists as a route target, but is currently a placeholder.
- `RoomPage` owns the main 3D Canvas and is the eventual scene composition boundary.
- `Room` is the current architectural scene group and receives the shared RoomDocument.
- `src/domain/roomGeometry.js` provides room bounds, wall length, wall centers, directions, and opening world positions.
- The RoomDocument provides the architectural context needed by a future placement/runtime adapter.

### Not present in the main project

The following were not found as implemented main-project modules:

- Furniture runtime or Furniture entity model;
- PARAMETRIC or LIBRARY furniture runtime;
- Placement system;
- GeometryProxy or VisualModel implementation;
- SpatialAnalyzer;
- Collision system or `outOfBounds` implementation;
- Scene dressing or furniture asset loading.

### Future integration boundary

The teammate project should be compared against these existing boundaries first:

1. `RoomPage.jsx` / its `<Canvas>` for scene composition;
2. `Room.jsx` for architectural scene context;
3. `roomGeometry.js` and the current RoomDocument for spatial facts;
4. `/furniture` as the eventual furniture-facing page route.

No furniture API or schema is invented by this handoff.

## H. Decision status

Decision Agent / Decision Logic is **not completely integrated** in this main project.

Inspection found no connected Decision Agent page, service, reducer, input contract, or output contract. The README explicitly places decision-agent workflows outside this Room Core. Any similarly named concepts in external experiments must not be assumed to exist here.

Therefore:

- Integrated: no complete Decision Agent flow found.
- Inputs: none connected in this main project.
- Outputs: none connected in this main project.
- Files/pages: no Decision-specific implementation found.

## I. DO NOT OVERWRITE

During integration, do not replace these main-project files wholesale with files from another project:

- `src/main.jsx`
- `src/App.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/FloorPlanPage.jsx`
- `src/pages/RoomPage.jsx`
- `src/pages/FurniturePage.jsx`
- `src/state/RoomDocumentContext.jsx`
- `src/state/useRoomDocument.js`
- `src/state/useSharedRoomDocument.js`
- `src/state/roomDocumentContext.js`
- `src/data/demoRoomDocument.js`
- `src/data/initialRoomDocument.js`
- `src/adapters/legacyDemoAdapter.js`
- `src/domain/roomSchema.js`
- `src/domain/roomValidation.js`
- `src/domain/roomGeometry.js`
- `src/domain/wallTopology.js`
- `src/domain/wallSnapping.js`
- `src/components/floorplan/FloorPlanEditor.jsx`
- `src/components/Room.jsx`
- `src/components/WallSegment.jsx`
- `src/components/floorplan/Opening2D.jsx`
- `src/config/features.js`

These files define the current RoomDocument contract, routing, shared state, wall/opening behavior, and the authoritative 2D-to-3D flow.

## J. Integration principle

`rental-home-demo` is a technical experiment/reference project for Furniture Runtime and related spatial experiments. It must not directly overwrite `home-demo-package`.

Use this sequence:

```text
compare
  → identify reusable modules
  → adapt to the main-project boundaries
  → migrate selectively
  → test 2D/3D and integration behavior
  → commit
```

Do not perform a whole-project copy, merge, or replacement as the integration strategy.

## K. Known issues (observed, not speculative)

1. `floorplanImport` is currently disabled in `src/config/features.js`; the image import/parser pipeline is retained but not exposed from `/floorplan`.
2. `README.md` contains older text that says `floorplanImport: true` and describes a 2.8m default, while the current code uses `false` and the Demo Room baseline uses 2.7m. This is documentation drift, not a Room runtime failure.
3. `RoomPage.jsx` clamps interactive 3D width edits to a minimum of 4m, while the current Demo Room baseline width is 3.2m. The baseline loads correctly, but the 3D width control cannot resize below that clamp.
4. `/furniture` is intentionally a placeholder; no furniture runtime is currently available in the main project.
5. The optional Vision/photo code references environment variables such as `OPENAI_API_KEY`, but no local `.env` or credential file was found during the security scan.

## Verification record

The handoff preparation verifies:

- RoomDocument v1 structure remains the current contract;
- Demo Room is provided by `src/data/demoRoomDocument.js`;
- 2D and 3D consume the same context state;
- no main-project Furniture/GeometryProxy/Collision/Decision runtime was assumed or fabricated;
- `pnpm run lint` and `pnpm run build` are the required project checks.
