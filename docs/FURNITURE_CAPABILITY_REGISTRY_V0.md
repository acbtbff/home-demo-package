# Furniture Capability Registry V0

## Architecture

The existing `Furniture` core object remains the single domain object:

`Furniture → semantic.archetype → Capability Registry → Furniture Router → Model Resolver → PARAMETRIC / LIBRARY / GENERATED → VisualModel + GeometryProxy`

The router selects a production strategy. The resolver selects the concrete generator or asset representation. Neither layer mutates `Furniture.physical.dimensionsM`, placement, or room state. `GeometryProxy` continues to derive from physical dimensions, with one world unit equal to one meter, Y as height, and a bottom-center pivot.

## Coverage Matrix

The registry contains every legal V0 taxonomy archetype. `READY` means a real handler or a real ready asset is available now. `PLANNED` records the intended route without inventing a handler or asset. `FALLBACK_ONLY` means the archetype is recognized but currently has only a safe fallback route.

| Category | Archetype | Preferred strategy | Status | Current handler / asset | Fallback |
| --- | --- | --- | --- | --- | --- |
| TABLE | DESK | PARAMETRIC | READY | `DESK` / `createParametricDeskSpec` | — |
| TABLE | DINING_TABLE | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| TABLE | COFFEE_TABLE | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| TABLE | ROUND_COFFEE_TABLE | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| CHAIR | OFFICE_CHAIR | LIBRARY | READY | `office-chair-local-v0` | — |
| CHAIR | DINING_CHAIR | LIBRARY | PLANNED | none | PROXY_ONLY |
| CHAIR | STOOL | LIBRARY | PLANNED | none | PROXY_ONLY |
| BED | SINGLE_BED | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| BED | DOUBLE_BED | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| SOFA | TWO_SEAT_SOFA | LIBRARY | READY | `two-seat-sofa-local-v0` | — |
| SOFA | THREE_SEAT_SOFA | LIBRARY | PLANNED | none | PROXY_ONLY |
| STORAGE | WARDROBE | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | BOOKSHELF | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | CABINET | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | NIGHTSTAND | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | DESK_PEDESTAL | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | CHEST_OF_DRAWERS | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | OPEN_BOOKSHELF | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| STORAGE | GARMENT_RACK | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| APPLIANCE | REFRIGERATOR | LIBRARY | PLANNED | none | PROXY_ONLY |
| APPLIANCE | WASHING_MACHINE | LIBRARY | PLANNED | none | PROXY_ONLY |
| LIGHTING | FLOOR_LAMP | LIBRARY | READY | `floor-lamp-local-v0` | — |
| LIGHTING | DESK_LAMP | LIBRARY | PLANNED | none | PROXY_ONLY |
| LIGHTING | TABLE_LAMP | LIBRARY | PLANNED | none | PROXY_ONLY |
| RUG | AREA_RUG | PARAMETRIC | PLANNED | none | PROXY_ONLY |
| SPECIAL | LADDER_SPECIAL | GENERATED | FALLBACK_ONLY | provider pending | GENERATED_PENDING / PROXY_ONLY |
| OTHER | OTHER | GENERATED | FALLBACK_ONLY | provider pending | GENERATED_PENDING / PROXY_ONLY |

Current real READY capabilities are exactly DESK, OFFICE_CHAIR, TWO_SEAT_SOFA, and FLOOR_LAMP. No new GLB or parametric generator is added in V0.

## Generated and proxy fallback policy

Generated is a long-tail integration slot, not a universal default. The current provider remains validation-pending and no external API is called. If a preferred representation cannot be resolved, the resolver returns a pending result with `visualModelAvailable: false` and `fallback: PROXY_ONLY`. The Furniture core object and its GeometryProxy remain available. Whether pending representations may be placed in the product UI remains governed by the existing placement/product rules; this task does not change that policy.

## How to add a new archetype

1. Add the legal value to `furnitureTaxonomy.js` (and its category list) with a taxonomy contract test.
2. Add one entry to `furnitureCapabilityRegistry.js` with its preferred strategy and honest status.
3. For LIBRARY, add one or more asset metadata entries to the asset pool. For PARAMETRIC, register a real generator handler. For GENERATED, leave the provider pending until it is validated.
4. The existing router and model resolver will select the route and representation automatically.
5. The same Furniture core object continues through `VisualModel`, `GeometryProxy`, placement, room, collision, and Decision. Room, FurniturePage, GeometryProxy, Placement, and the style/decision pipelines do not need archetype-specific edits.

## Developer coverage report

Run `pnpm run report:furniture-coverage` to print counts and every registered archetype, strategy, current handler/assets, and fallback. The report is intentionally a pure development script with no UI or third-party dependency.
