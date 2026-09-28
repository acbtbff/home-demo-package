# MYROOMIE Product Roadmap

## Phase 1 — Digital Home and Furniture Assets

Goal: create a reliable, reusable personal room and furniture inventory.

- Maintain canonical 2D/3D room geometry in metres.
- Record owned, landlord-provided, and wishlist furniture.
- Support assembled, folded, and disassembled physical states.
- Capture dimensions, weight, volume, handling limits, and provenance.
- Let users correct and confirm AI- or catalog-suggested facts.
- Keep visual models separate from verified physical facts.
- Add persistence and migration for existing `Furniture` records.

Exit criteria:

- A furniture asset can report whether it is ready for spatial planning, payload planning, and packing optimization.
- Missing or unverified critical facts are visible instead of silently defaulted.

## Phase 2 — Purchase and Spatial Decisions

Goal: turn the digital inventory into practical purchase and layout assistance.

- Preview wishlist furniture at real scale.
- Evaluate room fit, collision, circulation, and layout alternatives.
- Run deterministic rules before any AI agent.
- Use live-agent reasoning only for genuine trade-offs.
- Preserve source facts and explain every recommendation.
- Remove demo presets from normal product workflows.

Exit criteria:

- A recommendation uses the user's actual room and furniture assets.
- Advice never changes ownership or purchase state without an explicit user action.

## Phase 3 — Moving and Vehicle Loading

Goal: generate feasible moving plans from selected furniture assets.

### V0

- Select items and one physical state per item.
- Define rectangular vehicle cargo space, door clearance, and payload.
- Check missing facts and hard infeasibility before optimization.
- Run rectangular 3D bin-packing heuristics.
- Return multiple scored plans with unplaced items and explanations.
- Visualize item placement and loading order with box proxies.

### Later iterations

- Weight distribution and axle-aware constraints.
- Stack support, fragility, orientation, and unload-order constraints.
- Multiple vehicles or repeated trips.
- Irregular furniture geometry and clearance paths.
- Human-readable loading instructions and mover collaboration.

Exit criteria:

- Users can understand vehicle size, trip count, unplaced items, and a reproducible loading sequence.

## Phase 4 — Personal Living Management Platform

Goal: support a furniture asset throughout its useful life.

- Move history and cross-home migration.
- Furniture circulation and second-hand transactions.
- Moving-service and vehicle-provider integration.
- Maintenance, resale, donation, and disposal workflows.
- Optional community and shared-home collaboration.

## Repository Transition

- Preserve the hackathon demo as an archive/tag.
- Use `main` as the stable product branch.
- Integrate contracts and migrations before presentation features.
- Keep recognition, model generation, and packing solvers replaceable behind explicit interfaces.
- Merge only after contract tests, lint, build, and migration checks pass.
