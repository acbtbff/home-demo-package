# Rental Home Demo - Room Core

## Project Scope

This repository is a floor-plan-first room core for rental-home layout capture.

It owns this product chain:

```text
Floor Plan Reference
  -> FloorplanImageDraft (pixel geometry)
  -> User scale calibration
  -> RoomDocument (meters)
  -> 2D Floor Plan
  -> Manual Correction
  -> 3D Room
```

It does not own movable-object recognition, movable-object semantics, visual-resource matching, collision, gesture recognition, pricing, or decision-agent workflows. Those belong in later modules or separate branches.

## Current Capabilities

- Upload JPG, PNG, WebP, GIF, or SVG floor-plan images and preview them locally.
- Parse an image into validated pixel geometry (`FloorplanImageDraft`).
- Calibrate pixels to meters from an overall width/depth or one known wall length.
- Convert the calibrated draft into the canonical `RoomDocument`.
- Use a deterministic built-in floor-plan fixture for a stable end-to-end hackathon demo.
- Optionally call the existing local Vision server for non-fixture images.
- Create a digital room from the result and correct it in the 2D editor.
- Set the room height in meters before entering the 3D room (2.8m by default).
- Keep the 4-8 photo room scan implementation behind a disabled feature flag.
- Preview and remove uploaded photos locally.
- Use a known room-width scale anchor.
- Run a mock room-structure analysis without a backend.
- Keep the real Vision backend integration code for future use.
- Convert `PhotoRoomDraft` into a canonical `RoomDocument`.
- Render and edit an SVG 2D floor plan.
- Select, add, delete, and edit wall segments.
- Drag wall endpoints with endpoint-to-endpoint and endpoint-to-wall-segment snapping.
- Keep snapping non-permanent: snapped points can still be pulled apart later.
- Edit doors and windows along their bound walls.
- Validate RoomDocument wall/opening geometry.
- Show exterior-wall closure warnings without blocking 3D entry.
- Render a 3D room from the same RoomDocument.

## RoomDocument Schema

`RoomDocument v1` is pure room structure:

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
  room,
  walls,
  openings,
  materials,
}
```

`walls[]` is the only wall data source. Each wall uses `start` and `end` points in meters on the X/Z floor plane, plus height, thickness, kind, and material.

`openings[]` binds doors/windows to walls by `wallId` and `offset` along the wall from `wall.start`.

## FloorplanImageDraft Schema

`FloorplanImageDraft v1` is the plug-in boundary for floor-plan image parsers:

```js
{
  schemaVersion: 1,
  source: { type, provider, confidence },
  image: { widthPixels, heightPixels },
  bounds: { minX, minY, maxX, maxY },
  scale: { pixelsPerMeter, confidence },
  walls: [{ id, kind, start, end, thicknessPixels, confidence }],
  doors: [{ id, wallId, center, widthPixels, heightMeters, confidence }],
  windows: [{ id, wallId, center, widthPixels, heightMeters, sillHeightMeters, confidence }],
}
```

Coordinates use image pixels with a top-left origin. The adapter refuses to create a metric `RoomDocument` until the user supplies a valid calibration length. The schema and runtime validation live in `src/domain/floorplanImageDraft.js`; the metric conversion lives in `src/adapters/floorplanImageAdapter.js`.

## PhotoRoomDraft Schema

`PhotoRoomDraft v1` is a room-structure draft:

```js
{
  schemaVersion,
  source,
  scaleAnchor,
  walls,
  doors,
  windows,
  openings?,
  uncertainties,
}
```

The draft describes architectural structure only: wall geometry, doors, windows, generic openings, scale information, confidence, and uncertainty notes.

## Local Running

Use Node.js `>=20.19`.

```bash
pnpm install
pnpm dev
```

By default, floor-plan parsing is fixture-only. Click **使用内置示例户型图**, parse it, enter its printed overall width `9.6m`, and continue into the 2D editor. The fixture image and its deterministic pixel geometry are:

```text
public/fixtures/floorplan-demo.svg
fixtures/floorplan/demo-floorplan-draft.json
```

The parser matches the exact image content by SHA-256. A different upload does not receive fabricated geometry; the UI explains that a real Vision service is required.

To enable real parsing for other raster floor plans, run the existing server with `OPENAI_API_KEY` configured and start the web app with `VITE_FLOORPLAN_VISION_MODE=real`. The browser calls `POST /api/analyze-floorplan`; the response must pass the same `FloorplanImageDraft` validator before calibration is offered.

The disabled photo-room workflow still uses its separate mock draft from `fixtures/photo-room/sample-draft.json` when that feature is explicitly re-enabled.

The future real-Vision path is still present:

```bash
pnpm vision:server
```

That server expects `OPENAI_API_KEY` and is not required for this room-core mock flow.

## Feature Flags

Feature availability is controlled in `src/config/features.js`:

```js
export const FEATURES = {
  floorplanImport: true,
  photoRoomScan: false,
}
```

Set `photoRoomScan` to `true` to restore the existing photo capture entry. The capture component, adapter, service, fixture, and backend code remain in the project.

## Verification

```bash
pnpm lint
pnpm build
```

## Key Files

```text
rental-home-demo/
├─ fixtures/photo-room/sample-draft.json
├─ fixtures/floorplan/demo-floorplan-draft.json
├─ public/fixtures/floorplan-demo.svg
├─ server/photoVisionServer.mjs
├─ src/
│  ├─ App.jsx
│  ├─ adapters/
│  │  ├─ floorplanImageAdapter.js
│  │  ├─ legacyDemoAdapter.js
│  │  └─ photoRoomAdapter.js
│  ├─ components/
│  │  ├─ PhotoRoomCapture.jsx
│  │  ├─ Room.jsx
│  │  ├─ WallSegment.jsx
│  │  └─ floorplan/
│  │     ├─ DimensionLabel.jsx
│  │     ├─ FloorPlanEditor.jsx
│  │     ├─ FloorPlanImport.jsx
│  │     ├─ Opening2D.jsx
│  │     ├─ Wall2D.jsx
│  │     ├─ WallHandle.jsx
│  │     └─ floorPlanCoordinates.js
│  ├─ data/initialRoomDocument.js
│  ├─ domain/
│  │  ├─ floorplanImageDraft.js
│  │  ├─ photoRealityMetrics.js
│  │  ├─ photoRoomDraft.js
│  │  ├─ roomGeometry.js
│  │  ├─ roomSchema.js
│  │  ├─ roomValidation.js
│  │  └─ wallTopology.js
│  ├─ services/
│  │  ├─ floorplanImageParser.js
│  │  ├─ floorplanImagePrompt.js
│  │  ├─ photoRoomPrompt.js
│  │  └─ photoRoomVision.js
│  └─ state/useRoomDocument.js
├─ package.json
├─ pnpm-lock.yaml
└─ vite.config.js
```

## Architecture Notes

- `FloorPlanEditor` and the 3D `Room` read the same `RoomDocument` and dispatch into the same reducer.
- `floorplanImageParser.js` is the only image-parser service boundary. Replace or extend it to connect another model; the calibration, adapter, editor, validation, and 3D layers remain unchanged.
- Validation blocks schema and geometry errors only.
- Exterior closure analysis lives in `wallTopology.js` and remains a warning layer.
- `snap` is coordinate alignment, not a permanent topology graph.
- The 3D scene intentionally renders an empty architectural room: floor, walls, thickness, height, diagonal wall support, openings, and window glass.
