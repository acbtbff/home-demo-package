# Furniture Runtime V0 Integration Report

Date: 2026-08-29

## Status

Integrated into a new copy of `home-demo-package`; the uploaded main project was not overwritten.

The main project remains the Source of Truth for:
- React Router and page structure
- `RoomDocument`
- 2D floor-plan editing
- 2D -> 3D room flow
- `Room` / `WallSegment`
- existing transparent-wall behavior
- floor-plan/photo-room related code

The teammate runtime is used only as the migration source for Furniture/Placement/Spatial capabilities.

## Migrated runtime capabilities

### Furniture domain
- `furnitureSchema.js`
- `furnitureTaxonomy.js`
- `furnitureSemantic.js`
- `furnitureRouter.js`
- `furnitureAssets.js`
- `styleBible.js`
- `visualModelContract.js`

Canonical physical truth remains `Furniture.physical.dimensionsM`.

### Placement and interaction
- `spatialContracts.js`
- `interactionCommands.js`
- `useFurnitureWorkspace.js`

Furniture identity remains separate from Placement.

### Visual runtime
- `FurnitureInstance.jsx`
- `FurnitureVisualModel.jsx`
- `GeometryProxyBox.jsx`
- `ParametricDesk.jsx`
- `LibraryGlbModel.jsx`
- `FurnitureInspector.jsx`

### Spatial runtime
- `spatialAnalyzer.js`

It consumes the main project's existing `RoomDocument` wall/opening structure. No duplicate Room schema was introduced.

### Assets
- `office-chair.glb`
- `two-seat-sofa.glb`
- `floor-lamp.glb`

### Contract tests
- `furnitureRepresentationV0.contract.test.mjs`
- `spatialAnalyzerV0.contract.test.mjs`
- `spatialConstraintV0.contract.test.mjs`

## Main-project integration

A shared `FurnitureWorkspaceProvider` was added above the routes and inside the existing `RoomDocumentProvider` so `/furniture` and `/room` see the same Furniture/Placement state.

`RoomPage` now:
- renders Furniture instances in the existing React Three Fiber Canvas;
- preserves the existing Room and wall rendering;
- keeps OrbitControls;
- supports furniture move and Y rotation;
- exposes GeometryProxy debug rendering;
- consumes SpatialAnalyzer collision/out-of-bounds facts;
- includes the teammate FurnitureInspector without replacing the room editor.

`FurniturePage` now:
- exposes PARAMETRIC Desk;
- exposes LIBRARY Sofa, Office Chair and Floor Lamp;
- shows current Furniture instances;
- can add/remove furniture and jump to the 3D room;
- explicitly shows GENERATED as pending instead of pretending a generated model exists.

## GENERATED route

GENERATED is deliberately preserved.

Current state:
- `MODEL_STRATEGIES.GENERATED` exists;
- V0 Router still maps `LADDER_SPECIAL -> GENERATED`;
- the GLB visual runtime now accepts both `LIBRARY` and `GENERATED` READY assets through the same normalized GLB loader;
- a pending Generated asset registry entry exists and is `UNAVAILABLE` with no fake model URL;
- no generated GLB was present in the teammate handoff ZIP.

This means a prior photo-to-3D experiment can be added later without redesigning the runtime. It does not have to be a ladder: add/confirm the appropriate Archetype, register the READY Generated asset, provide real dimensions, and the existing GLB runtime can render it.

See `GENERATED_PIPELINE_PENDING.md`.

## Explicitly not migrated / not overwritten

The teammate versions of the following were not copied over the main project's versions:
- `src/App.jsx` as an application implementation
- `src/main.jsx`
- `src/components/Room.jsx`
- `src/components/WallSegment.jsx`
- `src/components/floorplan/*`
- `src/state/useRoomDocument.js`
- teammate Room schema/Room state
- teammate photo-room flow

Only the main `App.jsx` was minimally changed to mount `FurnitureWorkspaceProvider`.

## Verification

- TypeScript compiler parser syntax-check of all `src/**/*.js` and `src/**/*.jsx`: PASS.
- Relative import existence check: PASS.
- Furniture/Spatial contract tests: 3/3 PASS.
- Secret scan: no `.env`, private key, GitHub token or OpenAI key value found. References to the `OPENAI_API_KEY` environment variable remain, but no value is included.
- `pnpm lint` / `pnpm build`: not executable in this sandbox because package dependencies are not installed and the sandbox cannot reach `registry.npmjs.org`. The integration adds no new npm dependency beyond those already declared by the main project.

## Local verification to run after download

From the integrated project folder:

```bash
pnpm install
pnpm run test:contracts
pnpm run lint
pnpm run build
pnpm run dev
```

Then test:
1. `/floorplan` -> change room dimensions -> `/room`; verify the room still follows the shared RoomDocument.
2. `/furniture` -> add Office Chair -> verify `/room` shows it.
3. Drag furniture with left mouse.
4. Rotate furniture with Shift+drag or right-drag.
5. Toggle GeometryProxy in the Room furniture inspector.
6. Try to drag a furniture item through an exterior wall or another furniture item; hard-block behavior should remain.
7. Drag into an interior partition wall; it may be allowed with warning according to the runtime's V0 collision policy.
8. Refresh/check the existing Router routes and existing transparent-wall behavior.



## Demo room correction (v0.1)

The default presentation room now uses the main-project demo layout with exterior walls only. The two test bathroom partitions (`wall-bath-01`, `wall-bath-02`) were removed from the default `INITIAL_ROOM_DOCUMENT`. Interior/partition wall collision support remains fully implemented in `SpatialAnalyzer`; contract tests now create test-only partition walls instead of changing the presentation room.

## Demo room correction (v0.2 — confirmed baseline)

The default presentation Room now matches the user-confirmed demo floor plan:

- 3.2 m net width
- 5.0 m net depth
- 2.7 m wall height
- no interior partition walls
- centered window on `wall-north`
- entry door on `wall-south`, toward the right side

Exact door/window sizes are not labeled in the reference image, so V0.2 uses documented approximate opening values. See `DEMO_FLOORPLAN_BASELINE.md` and `docs/demo-floorplan-reference.jpg`.

The default Desk and Sofa placements were also moved inside the smaller 3.2 × 5.0 room so the integrated demo starts without false out-of-bounds/collision errors.

The Room editor minimum width was lowered from 4 m to 2 m so the confirmed 3.2 m demo width remains editable rather than being forced back to 4 m.

Interior-wall collision remains implemented and is tested with test-only partition walls; presentation geometry is not modified for collision testing.
