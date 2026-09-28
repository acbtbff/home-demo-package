# MYROOMIE Product Vision

## Positioning

MYROOMIE is a personal spatial-asset and living-decision product for renters. It helps a user maintain an accurate digital record of rooms and furniture, then reuse those facts for purchase, layout, moving, and loading decisions across different homes.

The product is not defined by one hackathon demo or one 3D scene. Its durable value comes from a long-lived personal furniture inventory and decision workflows built on verified physical facts.

## Product Chain

```text
Room digitization
  -> Furniture digitization and user verification
  -> Personal furniture assets
  -> Purchase and spatial decisions
  -> Move-item selection
  -> Vehicle loading calculation
  -> 3D loading plan and instructions
```

## Core Product Principles

1. **Physical truth before visual polish.** Confirmed dimensions, weight, and handling limits are business facts. A 3D model or image estimate must not silently overwrite them.
2. **AI proposes; users verify critical facts.** AI and image recognition may prefill values, while product specifications, measurements, and user confirmation establish higher-confidence facts.
3. **Every critical fact has provenance.** The system records source, confidence, and verification status for dimensions, weight, and handling constraints.
4. **Furniture has multiple physical states.** Assembled, folded, and disassembled states can have different dimensions and packing constraints.
5. **Decision outputs stay explainable.** Purchase, move, and loading recommendations expose missing facts, constraints, and reasons.
6. **3D is a decision interface.** Visualization should help users understand fit, conflicts, loading order, and alternatives rather than serve as decoration only.

## Differentiating Direction

Moving and vehicle-loading decisions are a core long-term direction. They connect furniture capture, accurate physical records, room planning, move selection, vehicle constraints, and 3D visualization into one practical workflow.

The first loading release will use axis-aligned rectangular proxies and heuristic 3D bin-packing. It will generate feasible, scored alternatives rather than promise a mathematically global optimum. Future releases may add irregular shapes, weight distribution, access paths, unloading order, and service-provider integration.

## Current Boundary

The repository already contains useful room, furniture, spatial-analysis, wishlist, and decision-rule foundations. Live-agent and gesture demonstrations exist on separate branches. Persistent accounts, production-grade recognition, verified furniture specifications, and a packing solver are not yet complete.
