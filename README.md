# MYROOMIE

MYROOMIE is a personal spatial-asset and living-decision product for renters. It maintains reusable digital records of rooms and furniture, then applies those facts to purchase, layout, moving, and vehicle-loading decisions.

## Product Direction

```text
Room digitization
  -> Furniture digitization and verification
  -> Personal furniture assets
  -> Purchase and spatial decisions
  -> Move-item selection
  -> Vehicle loading calculation
  -> 3D loading plan
```

The project began as a hackathon demo, but the product direction is not limited to a demo. The current repository is being transitioned toward accurate furniture assets and practical decisions. See [PRODUCT_VISION.md](PRODUCT_VISION.md) and [ROADMAP.md](ROADMAP.md).

## Current Capabilities

- Canonical room geometry in metres through `RoomDocument`.
- Deterministic sample floor plan, scale calibration, and 2D editing.
- 3D room rendering from the same room document.
- Furniture identity separated from room placement.
- Real-scale furniture placement, movement, Y-axis rotation, collision, and out-of-bounds analysis.
- Owned, landlord-provided, and wishlist furniture flows.
- Furniture photo preview, type confirmation, manual dimensions, and product metadata.
- Parametric and library-backed furniture representations.
- Purchase and move decision-rule foundations with explicit evidence and validation.
- Additive `FurnitureAsset V1` contract for multiple physical states, provenance, and packing readiness.
- `Packing Contract V0` boundary for future vehicle-loading optimization.

## Important Current Limits

- Furniture image recognition is not yet a production measurement system.
- Critical dimensions, weight, and handling constraints still require user or source verification.
- Live-agent, purchase-decision UI, and gesture integrations remain on development/demo branches and are not all in `main`.
- Generated 3D furniture is a pending representation route, not a completed image-to-3D service.
- Packing contracts exist, but a 3D bin-packing solver and truck-loading UI are not yet implemented.
- Persistent user accounts and cloud furniture inventories are not yet implemented.

## Domain Contracts

- [FurnitureAsset Contract V1](docs/FURNITURE_ASSET_CONTRACT_V1.md)
- [Packing Contract V0](docs/PACKING_CONTRACT_V0.md)
- `src/domain/furnitureSchema.js` — current compatible Furniture record
- `src/domain/furnitureAsset.js` — long-lived physical asset facts
- `src/domain/packingContracts.js` — solver-independent packing inputs and outputs
- `src/domain/spatialContracts.js` — room placement and geometry proxies

## Application Routes

- `/` — product entry
- `/floorplan` — room/floor-plan workflow
- `/room` — 3D room and furniture placement
- `/furniture` — furniture inventory, intake, wishlist, and editing

Floor-plan import and photo-room scan remain feature-flagged. The built-in room fixture provides a deterministic development path.

## Local Development

Use Node.js `>=20.19`.

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm test:contracts
pnpm lint
pnpm build
```

## Branch Policy

- `main` is the stable product branch.
- The hackathon demo should remain available as an archive/tag.
- Product contracts and migrations land before presentation-only features.
- Recognition, model generation, decision agents, and packing solvers remain replaceable behind explicit interfaces.
