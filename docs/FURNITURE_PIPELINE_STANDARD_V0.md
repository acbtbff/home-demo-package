# Furniture Pipeline Standard V0

## 1. Purpose

This document freezes the engineering interface for every furniture production route. `PARAMETRIC`, `LIBRARY`, and `GENERATED` may use different authoring inputs, but once an item enters a room it is consumed as the same `Furniture + Placement + GeometryProxy + VisualModel` runtime contract. This is a boundary document, not a new furniture feature or style implementation.

## 2. World Scale Contract

The Three.js world uses metres: **one world unit equals one metre**. Room dimensions and `Furniture.physical.dimensionsM` therefore share one scale. A value such as `3.2` means 3.2 m, never 3.2 cm or an arbitrary display unit. Centimetres are presentation-only conversions (for example, inspector labels). The frozen constants are in `src/domain/worldScale.js` and `ROOM_UNITS` remains `"meters"`.

## 3. Coordinate System

`Y` is up/height. `X` and `Z` are the floor plane. Furniture translation is `Placement.position.x/z`; `position.y` is vertical placement. Floor rotation is `Placement.rotationY` in radians. Furniture instances use a `bottom-center` pivot: local X/Z are footprint-centred and local Y starts at the model bottom, so a floor-standing placement has `position.y = 0`. Furniture business state does not contain a second Euler rotation.

## 4. Physical Size Source of Truth

`Furniture.physical.dimensionsM = { width, depth, height }` is the only physical-size fact. `GeometryProxy` copies these values for out-of-bounds, collision, wall collision, occupancy, path-width, and future decision facts. GLB or generated bounding boxes, visual scale, materials, and style processing must never write back to `dimensionsM`.

## 5. Scaling Policy

Physical size and visual scale are separate. `GeometryProxy` has no independent visual size. `PARAMETRIC` regenerates geometry from dimensions. `LIBRARY` and `GENERATED` may calibrate a visual asset after loading it, centring X/Z and bottom-aligning Y, while keeping physical dimensions unchanged. `calculateLibraryVisualCalibration` reports a warning when asset and target aspect ratios differ by more than the V0 tolerance (35% relative deviation); V0 does not silently change physical facts or implement asset matching. User interaction is Move and Rotate-Y only; free-scale is not part of the runtime contract.

## 6. Furniture / Placement Separation

`Furniture` describes what an object is. `Placement` describes where one instance is in one room/plan:

```js
{ furnitureId, roomId, position: { x, y, z }, rotationY }
```

Position and rotation are never permanent Furniture identity fields. The same Furniture can have different placements in rooms or alternatives. `FurnitureInstance` receives both objects and applies the parent transform only from Placement.

## 7. PARAMETRIC Contract

Status: **VALIDATED** (Desk is the current validation fixture). Input is Furniture semantic/archetype plus canonical dimensions. The matching generator (`createParametricDeskSpec`) produces geometry directly in metre units. Changing `dimensionsM` changes the generated part sizes; a fixed-size mesh stretched with Three.js scale is not the contract.

## 8. LIBRARY Contract

Status: **VALIDATED** (Office Chair is the current validation fixture; Sofa and Floor Lamp are reference implementations). The resolver selects a READY asset, loads its GLB, applies asset normalization, computes the original bounding box, calibrates the visual scale to Furniture dimensions, centres X/Z, and bottom-aligns Y. Bounding-box values are visual inputs only. The shared `LibraryGlbModel` runtime is also the normalization path for future Generated GLBs.

## 9. GENERATED Contract

Status: **INTERFACE RESERVED / VALIDATION PENDING**. The route, strategy enum, asset source, registry slot, and shared GLB runtime remain present. No generated asset is currently validated in the main project. When one is supplied, it must carry separately confirmed real dimensions and reuse the LIBRARY normalization/calibration path; it must not create a second renderer. The eventual sample may be any reasonable long-tail furniture asset.

## 10. GeometryProxy Contract

The V0 proxy is a `BOX` with `pivot: "bottom-center"` and dimensions copied strictly from `Furniture.physical.dimensionsM`. It is the spatial representation used by SpatialAnalyzer and debug rendering. It is never derived from a VisualModel or GLB bounding box.

## 11. VisualModel Contract

VisualModel controls appearance only. It may be unavailable while GeometryProxy and spatial analysis remain valid. It must not define physical dimensions, Placement, collision, out-of-bounds, occupancy, or Decision facts. All three strategies converge on this output boundary.

## 12. Ownership Contract

Ownership is a domain fact, separate from lifecycle. V0 supports `ownership.type: USER | LANDLORD | NONE`. Ownership does not imply mobility or a placement lock; a future `mobility`/`placementConstraint` capability is a separate concern.

## 13. Lifecycle Contract

Lifecycle remains the existing `lifecycle` object and is extended rather than duplicated. V0 supports `status: OWNED | WISHLIST`; existing statuses such as `SOLD`, `DISCARDED`, and `GIVEN_AWAY` remain representable. Minimum valid meanings are `USER + OWNED` (user-owned), `LANDLORD + OWNED` (landlord-owned), and `NONE + WISHLIST` (not purchased / wishlist). These are facts, not visual style. A renderer may later choose a wishlist treatment only after reading the explicit status.

## 14. Style Pipeline Integration Boundary

Style Pipeline may change visual geometry, bevels, reasonable visual proportions, materials, palette, textures, roughness, metallic values, detail, decorative geometry, and silhouette simplification. It must not change Furniture ID, category, archetype, `physical.dimensionsM`, ownership, lifecycle facts, GeometryProxy physical size, Placement, collision/out-of-bounds facts, room dimensions, or Decision data. A thicker leg or rounded tabletop is visual; the proxy and canonical dimensions still describe reality.

Route policy: PARAMETRIC generators should target the Style Bible natively; LIBRARY prefers stylized/clean assets followed by material/palette normalization and cleanup; GENERATED prompts should request stylized output and the resulting GLB still requires normalization, calibration, material/palette normalization, and quality checks.

## 15. Future Furniture UI Semantics

No full ownership/wishlist UI or shader is implemented in V0. Future presentation may label landlord-owned items or show a lock icon without making them immovable. `NONE + WISHLIST` may use a preview/ghost treatment (approximately 0.55–0.75 opacity or reduced saturation). User scaling remains disabled; editing canonical dimensions is the future path for correcting reality, followed by regeneration/recalibration and spatial re-analysis.

## 16. Current Validation Status

- **PARAMETRIC: VALIDATED** — Desk generator and dimension-driven contract tests.
- **LIBRARY: VALIDATED** — Office Chair route plus shared GLB normalization/calibration contract.
- **GENERATED: INTERFACE RESERVED / VALIDATION PENDING** — route and registry slot retained; no final Generated asset is part of the current main project.

Contract tests also freeze metre scale, Y/XZ coordinates, bottom-center proxy derivation, visual-scale non-mutation, Furniture/Placement independence, ownership/lifecycle semantics, and preservation of the Generated route. The standardization task intentionally does not modify RoomDocument architecture, floor-plan geometry, router flow, demo dimensions, Decision Logic, or UI scale controls.
