# ARCHITECTURE.md

## Room Core

Current runtime is a single Room Core pipeline:

`Photo -> Mock / Vision -> PhotoRoomDraft -> RoomDocument -> 2D FloorPlanEditor -> 3D Room`

The 2D editor and the 3D scene read from the same `RoomDocument` state in `src/App.jsx`.

## Framework Identification

The frontend is a React 19 + Vite application. The 3D view is React Three Fiber on top of Three.js, while the 2D floor plan is SVG-based React. The shared room state originates from `useRoomDocument` in `src/App.jsx`; both editors consume that single `RoomDocument`.

## RoomDocument

Current `RoomDocument` is the canonical architectural source of truth.

Required invariants:
- `schemaVersion: 1`
- `units: "meters"`
- `coordinateSystem.upAxis = "y"`
- `coordinateSystem.floorAxes = ["x", "z"]`
- wall and opening geometry stay in room space

Current room data owns:
- `room`
- `walls[]`
- `openings[]`
- `materials[]`

It does not own furniture placement.

Current schema shape:

```js
{
  schemaVersion,
  id,
  units,
  coordinateSystem: {
    handedness,
    upAxis,
    floorAxes,
  },
  source,
  room: {
    id,
    name,
    floorElevation,
    floorThickness,
    defaults,
    estimatedBounds?,
  },
  walls: [
    {
      id,
      roomId,
      start: { x, z },
      end: { x, z },
      height,
      displayHeight?,
      thickness,
      kind,
      materialId,
      source?,
    },
  ],
  openings: [
    {
      id,
      type,
      wallId,
      offset,
      width,
      height,
      sillHeight,
      source?,
    },
  ],
  materials,
}
```

`walls[]` remains the only wall data source. `openings[]` binds to walls by `wallId` and `offset` measured from `wall.start` along the wall vector.

3D wall solids are derived, not stored separately. Each wall's local X axis runs from `wall.start` to `wall.end`; openings split that local span into solid wall parts. Window glass is a rendering-only layer and does not participate in spatial segmentation.

## Placement Contract

Furniture identity and room placement must remain separate.

Planned placement shape:

```js
{
  id,
  furnitureId,
  roomId,
  position: { x, y, z },
  rotationY,
}
```

Meaning:
- `Furniture` describes the object
- `Placement` describes where that object sits in a room plan
- `position.x` and `position.z` are floor-plane coordinates in meters
- `position.y` is height in meters and defaults to floor contact for floor-standing objects
- `rotationY` is radians around the vertical Y axis
- `roomId` points to the target `RoomDocument.room.id`
- `furnitureId` points to the Claude-owned furniture object

## GeometryProxy Contract

`GeometryProxy` is the spatial truth source for furniture footprint logic.

Planned shape:

```js
{
  furnitureId,
  dimensionsM,
  shape,
  pivot,
}
```

Version 1 rules:
- `shape` only needs `BOX`
- `pivot` is `bottom-center`
- `dimensionsM` is the authoritative size
- `dimensionsM.width` maps to local X
- `dimensionsM.height` maps to Y
- `dimensionsM.depth` maps to local Z
- GLB bounding boxes are not the truth source
- `GeometryProxy` may be derived from `furniture.physical.dimensionsM`, but it is not derived from `VisualModel`

## Spatial Analyzer Output

Future analyzer output is frozen as a contract only:

```js
{
  outOfBounds,
  collisionDetected,
  physicalFit,
  canReconfigure,
  pathWidthAfterPlacementCm,
  spatialImpact,
  occupiesScarceSpace,
}
```

Field semantics:
- `outOfBounds`: placement footprint crosses the valid room floor boundary
- `collisionDetected`: placement footprint overlaps another occupied spatial proxy
- `physicalFit`: object dimensions can physically fit at the placement under current geometry constraints
- `canReconfigure`: analyzer believes a valid alternative placement may exist
- `pathWidthAfterPlacementCm`: narrowest relevant remaining passage width after placement, in centimeters
- `spatialImpact`: coarse impact label or structured score describing how much usable room area is consumed
- `occupiesScarceSpace`: placement consumes a constrained area such as a doorway-adjacent path, window access zone, or narrow circulation route

No algorithm is implemented in this phase.

## Furniture Representation V0

Furniture Representation is now owned by Codex, but remains logically separate from Spatial Core.

Canonical Furniture Object:

```js
{
  id,
  name,
  semantic,
  physical,
  lifecycle,
  appearance,
  modelStrategy,
}
```

Furniture rules:
- unknown values are `null`
- unknown values are not represented as `0`
- `physical.dimensionsM` is always meters
- Furniture contains no `position`, `rotationY`, or `roomId`
- Furniture contains no Three.js mesh/object
- Furniture contains no Decision result

## Furniture Taxonomy V0

Model reuse happens at Archetype level, not Category level.

Current archetypes:
- TABLE: `DESK`, `DINING_TABLE`, `COFFEE_TABLE`
- CHAIR: `OFFICE_CHAIR`, `DINING_CHAIR`, `STOOL`
- BED: `SINGLE_BED`, `DOUBLE_BED`
- SOFA: `TWO_SEAT_SOFA`, `THREE_SEAT_SOFA`
- STORAGE: `WARDROBE`, `BOOKSHELF`, `CABINET`
- APPLIANCE: `REFRIGERATOR`, `WASHING_MACHINE`
- LIGHTING: `FLOOR_LAMP`
- SPECIAL: `LADDER_SPECIAL`
- OTHER: `OTHER`

## Semantic Normalization

`normalizeFurnitureSemantic(input)` is deterministic and does not use an LLM.

Equivalent inputs such as `office chair`, `office-chair`, `office_chair`, and `OFFICE_CHAIR` normalize to:

```js
{
  category: "CHAIR",
  archetype: "OFFICE_CHAIR",
}
```

Unknown input safely falls back to:

```js
{
  category: "OTHER",
  archetype: "OTHER",
}
```

## Furniture Router

Canonical model strategies:
- `PARAMETRIC`
- `LIBRARY`
- `GENERATED`

Demo Strategy Map V0 is frozen in `MODEL_STRATEGY_BY_ARCHETYPE`:
- `PARAMETRIC`: `DOUBLE_BED`, `DESK`, `ROUND_COFFEE_TABLE`, `NIGHTSTAND`, `DESK_PEDESTAL`, `CHEST_OF_DRAWERS`, `OPEN_BOOKSHELF`, `GARMENT_RACK`, `AREA_RUG`
- `LIBRARY`: `OFFICE_CHAIR`, `TWO_SEAT_SOFA`, `FLOOR_LAMP`, `DESK_LAMP`, `TABLE_LAMP`
- `GENERATED`: `LADDER_SPECIAL`

The Strategy Map answers how an Archetype should normally be modeled. The Asset Registry independently records which concrete visual assets currently exist. Asset or GLB availability must not alter the frozen strategy.

`modelStrategy.preferred` is the taxonomy/router preference. `modelStrategy.resolved` is the final actually used strategy and may remain `null`.

## Asset Contract

Asset is a visual resource, not a furniture object and not a spatial proxy.

```js
{
  id,
  archetype,
  modelUrl,
  referenceDimensionsM: {
    width,
    depth,
    height,
  },
  styleFamily,
  source,
  status,
}
```

`referenceDimensionsM` cannot overwrite `Furniture.physical.dimensionsM`.

Asset Registry V0 is an ordered array, so multiple entries may coexist for one Archetype. `source` is `LOCAL`, `PURCHASED`, `GENERATED`, or `INTERNAL`; `status` is `READY`, `PLACEHOLDER`, or `UNAVAILABLE`.

## Asset Resolver

The V0 resolver contract is:

`Furniture.semantic.archetype -> first matching READY Asset`

The resolver does not read or choose Model Strategy. Strategy remains frozen in `MODEL_STRATEGY_BY_ARCHETYPE`; registry contents cannot modify it.

Missing visual assets are valid. If no asset is found, `VisualModel` may be unavailable and the system can still fall back to `GeometryProxy`.

The batch GLB planning inventory lives in `src/data/furnitureAssetInventory.js`. It maps exported filenames to likely taxonomy and frozen strategy metadata, but it is not the runtime Asset Registry or Furniture Catalog and cannot activate assets.

`TWO_SEAT_SOFA` is the first reusable GLB-backed LIBRARY pipeline. Its local asset URL is `/assets/furniture/two-seat-sofa.glb`; the registry entry is `READY`, its resolved strategy is `LIBRARY`, and it is active in the Demo runtime. GLB bounds are used only to center, floor-align, and visually fit the model to canonical Furniture dimensions.

## VisualModel Contract

`VisualModel` controls only what the user sees.

It does not define:
- physical dimensions truth
- collision
- out-of-bounds checks
- spatial occupancy
- Decision facts

Future visual strategies may be `PARAMETRIC`, `LIBRARY`, or `GENERATED`.

## Style Bible V0

`COZY_V0` targets Cozy Stylized 3D Home:
- clear silhouette
- rounded forms
- low detail
- remove tiny mechanical structures
- fewer sharp edges
- slightly thicker structural rods
- simplified surfaces
- low metallic
- medium/high roughness
- low reflection
- weak texture dependency

Palette tokens include `WARM_WHITE`, `CREAM`, `LIGHT_WOOD`, `DARK_WOOD`, `SAGE`, `DUSTY_BLUE`, `TERRACOTTA`, `BUTTER_YELLOW`, `WARM_GRAY`, `CHARCOAL`, `CLAY`, and `SOFT_BLACK`.

## Style Pipeline

All routes eventually enter one Style Pipeline:

`PARAMETRIC / LIBRARY / GENERATED -> STYLE PIPELINE -> web-compatible visual representation`

Pipeline contract:
- units normalization
- coordinate normalization
- pivot normalization
- cleanup
- simplification
- detail removal
- material normalization
- palette mapping
- bounding box verification
- web-compatible visual representation output

Bounding box verification validates the `VisualModel`; it cannot change canonical physical dimensions.

## Integration Boundary

Codex owns both Spatial Core and Furniture Representation, but the modules stay separated:
- Furniture Core produces object identity, semantics, physical metadata, lifecycle, appearance, and model strategy.
- Placement attaches a furniture object to a room plan.
- GeometryProxy derives spatial computation data from `Furniture.physical.dimensionsM`.
- VisualModel and Asset remain visual-only.
- Spatial Analyzer consumes RoomDocument, Placement, and GeometryProxy contracts.

## Spatial Contract Files

- `src/domain/spatialContract.js` is the architecture/frozen public contract.
- `src/domain/spatialContracts.js` contains runtime helpers and implementation-side contract utilities.
- The two files must not define competing sources of truth.
- `Furniture.physical.dimensionsM` remains the canonical physical dimension truth.
- `Placement` remains the only furniture transform truth.
- `GeometryProxy` is derived from `Furniture.physical.dimensionsM`.
- `VisualModel` remains visual-only.

## Input Layer

The interaction boundary is command-based:

```text
MouseInputAdapter
GestureInputAdapter (future)
  -> Interaction Command
    -> Room / Camera Commands
    -> Furniture Commands
      -> Placement
```

Current command rules:
- room / camera commands orbit the camera around the room
- furniture commands select, move, or rotate a selected furniture instance
- furniture move updates `Placement.position`
- furniture rotate updates `Placement.rotationY`
- no command mutates Three.js mesh transform directly

Future gesture mapping:
- two hands -> room / camera rotation
- one hand -> furniture interaction

Current mouse mapping:
- empty canvas drag -> room / camera orbit
- furniture drag -> move furniture on X / Z
- furniture drag with rotate modifier -> rotate furniture around Y
- selection is required for furniture move or rotate commands

## Runtime Furniture Instances

Current Demo runtime contains:
- Demo Desk -> `PARAMETRIC`
- Demo Two Seat Sofa -> `LIBRARY` (local GLB)

`OFFICE_CHAIR` remains a frozen `LIBRARY` Archetype. Its rejected internal visual is retired; the real `/assets/furniture/office-chair.glb` is registered as `READY` and uses the generic GLB pipeline.

Runtime composition:

`Furniture + Placement -> FurnitureInstance -> GeometryProxy + VisualModel`

## Furniture Catalog V0

The runtime catalog contains `DESK`, `TWO_SEAT_SOFA`, `OFFICE_CHAIR`, and `FLOOR_LAMP`. Catalog entries hold semantic identity, default dimensions, and frozen model strategy; they contain no Placement or Three.js objects.

`Catalog item -> new Furniture + separate Placement -> SpatialAnalyzer -> committed room instance`

Each addition receives unique Furniture and Placement ids. Initial placement uses a deterministic center-out search and rejects furniture collision, exterior-wall collision, and out-of-bounds candidates while retaining the interior-wall soft-warning policy. Removing an instance deletes only its Furniture and associated Placement; the catalog and Asset Registry remain unchanged.

Current implementation:
- Furniture data lives in `src/data/demoFurniture.js`
- Placement data lives beside each Demo furniture item but remains a separate object
- `FurnitureInstance` owns selection and floor-plane drag event handling
- Parent transform comes only from Placement
- `ParametricDesk` renders the Demo Desk
- `GeometryProxyBox` renders the optional debug occupancy box from `GeometryProxy`
- `FurnitureInspector` edits rotation and canonical furniture dimensions

## Runtime Notes

- 2D and 3D already share one `RoomDocument`
- wall snapping is editor-only room geometry behavior
- exterior wall closure is a warning gate, not a separate topology graph
- current 3D scene renders architectural space, Demo Desk, and Demo Two Seat Sofa
- Demo Desk uses `PARAMETRIC`
- Demo Two Seat Sofa uses the generic GLB-backed `LIBRARY` pipeline
- both instances use `Furniture + Placement + GeometryProxy + VisualModel`
- `RoomDocument` remains furniture-free
