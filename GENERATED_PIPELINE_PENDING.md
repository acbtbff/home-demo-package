# GENERATED Pipeline — Pending Asset Slot

GENERATED is preserved as a first-class model strategy but is not marked as validated in this integration.

## What is already wired

- `MODEL_STRATEGIES.GENERATED`
- Router support (V0 currently includes `LADDER_SPECIAL -> GENERATED`)
- Asset source `GENERATED`
- Generated asset registry slot
- GLB VisualModel loading for a READY Generated asset
- Furniture / Placement / GeometryProxy / SpatialAnalyzer are strategy-independent

## What is still missing

A real prior photo-to-3D experiment asset, including:
- final `.glb`;
- real-world width/depth/height;
- source photo(s), if available;
- model orientation / normalization notes, if needed;
- its actual semantic Archetype;
- optional generation notes (tool, prompt/settings, cleanup steps).

## How to add the prior experiment later

1. Copy its final GLB to `public/assets/furniture/`.
2. Do not use the GLB bounding box as the physical truth. Confirm the real dimensions separately.
3. If its Archetype does not exist yet, add the smallest appropriate Archetype to `furnitureTaxonomy.js`.
4. Map that Archetype to `MODEL_STRATEGIES.GENERATED` in `furnitureRouter.js`.
5. Replace/add the Generated asset entry in `furnitureAssets.js` with:
   - `source: ASSET_SOURCES.GENERATED`
   - `status: ASSET_STATUSES.READY`
   - `modelUrl: /assets/furniture/<file>.glb`
   - normalization only as needed for orientation/alignment.
6. Add a catalog/demo Furniture object only after real dimensions are known.
7. Run contract tests, lint/build and browser validation.

The previous experiment does **not** need to be renamed or treated as a ladder. `LADDER_SPECIAL` is only the currently frozen V0 Generated example in the Router.
