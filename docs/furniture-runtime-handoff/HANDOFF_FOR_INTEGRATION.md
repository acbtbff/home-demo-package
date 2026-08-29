# Furniture Runtime V0 — Offline Integration Handoff

## A. What this package is

This is **Furniture Runtime V0**, prepared for integration into a teammate-owned main application. It is an architecture and reference-runtime package, not a complete final website and not a release build.

The included Demo application exists to exercise and validate the furniture contracts and shared runtime. Do not replace the teammate's complete App, room workflow, or product shell with this Demo App.

## B. Core data chains

Spatial chain:

`Furniture -> Placement -> GeometryProxy -> SpatialAnalyzer -> Spatial Facts`

Visual chain:

`Furniture -> Router -> PARAMETRIC / LIBRARY -> VisualModel`

Both visual strategies converge into the same `FurnitureInstance`, Placement, GeometryProxy, SpatialAnalyzer, collision-policy, selection, drag, rotation, and removal runtime. Only VisualModel production differs.

## C. Mandatory architecture rules

- `Furniture` and `Placement` remain separate.
- `Furniture.physical.dimensionsM` is canonical physical-size truth.
- `GeometryProxy` is spatial-computation and collision truth.
- GLB assets and `VisualModel` are visual-only.
- GLB bounding boxes are used only for normalization and visual fitting; they never overwrite Furniture dimensions.
- Units are meters.
- Y is the up/height axis.
- X/Z form the ground plane.
- Furniture pivots are bottom-center.
- Placement rotation is around Y only.
- Placement remains transform truth; do not directly mutate Three.js meshes as saved state.
- A Decision Agent may emit decisions or interaction commands, but must not directly modify a Three.js mesh.

## D. Frozen collision policy

- Furniture ↔ Furniture: **HARD BLOCK**
- Furniture ↔ Exterior Wall: **HARD BLOCK**
- OutOfBounds: **HARD BLOCK**
- Furniture ↔ Interior / Partition Wall: **SOFT** — crossing is allowed and overlap is shown red

`SpatialAnalyzer` reports source-specific facts. The interaction layer interprets those facts. Do not collapse all collision sources into one hard-block boolean.

## E. Demo and reference implementations

| Furniture | Archetype | Strategy | Reference role |
| --- | --- | --- | --- |
| Desk | `DESK` | `PARAMETRIC` | Procedural visual reference using the shared runtime |
| Two Seat Sofa | `TWO_SEAT_SOFA` | `LIBRARY` | Generic Asset Registry → GLB → normalization → fitting reference |
| Office Chair | `OFFICE_CHAIR` | `LIBRARY` | Generic library asset, interaction, Placement, and GeometryProxy reference |
| Floor Lamp | `FLOOR_LAMP` | `LIBRARY` | Additional proof that the generic library pipeline is reusable |

Runtime GLBs included in this package:

- `public/assets/furniture/two-seat-sofa.glb`
- `public/assets/furniture/office-chair.glb`
- `public/assets/furniture/floor-lamp.glb`

## F. Known issues

### `OFFICE_CHAIR_VISUAL_FLOOR_GAP`

The Office Chair visual model has a recorded slight floor-contact gap. This does not affect GeometryProxy or collision truth. Do not compensate by changing `Placement.position.y`, Furniture physical dimensions, GeometryProxy, or collision rules. Any future correction belongs in visual asset normalization or generic visual bottom-alignment and requires separate browser acceptance.

## G. Integration ownership rule

The teammate's main project owns:

- Room and floor-plan domain
- Main website/product flow
- Decision Agent
- Final application composition and routing

This package owns/provides:

- Furniture schema and taxonomy
- Furniture Router
- PARAMETRIC and LIBRARY VisualModel paths
- Asset Registry and resolver
- Placement
- GeometryProxy
- SpatialAnalyzer and Spatial Facts
- Collision policy interpretation
- Furniture rendering and interaction references

During integration, port the shared furniture modules and connect them to the teammate's RoomDocument and application state through the documented contracts. Do **not** overwrite the teammate's complete App with `src/App.jsx` from this Demo.

## Package map

Shared core:

- `src/domain/furnitureSchema.js`
- `src/domain/furnitureTaxonomy.js`
- `src/domain/furnitureSemantic.js`
- `src/domain/furnitureRouter.js`
- `src/domain/spatialContracts.js`
- `src/domain/spatialAnalyzer.js`
- `src/domain/interactionCommands.js`
- `src/state/useFurnitureWorkspace.js`
- `src/components/furniture/FurnitureInstance.jsx`
- `src/components/furniture/FurnitureVisualModel.jsx`
- `src/components/furniture/GeometryProxyBox.jsx`

Strategy-specific visual production:

- PARAMETRIC: `src/domain/parametricDesk.js`, `src/components/furniture/ParametricDesk.jsx`
- LIBRARY: `src/domain/furnitureAssets.js`, `src/components/furniture/LibraryGlbModel.jsx`

Reference data:

- `src/data/demoFurniture.js`
- `src/data/furnitureCatalog.js`

## Verification commands

```shell
pnpm install
pnpm test:contracts
pnpm lint
pnpm build
```

Dependencies were already present when this package was prepared, so they were not reinstalled. The handoff package intentionally excludes `node_modules` and `dist`.
