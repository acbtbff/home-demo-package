# Packing Contract V0

## Scope

Packing Contract V0 defines inputs and outputs for future moving-load optimization. It is not a solver. It makes the solver replaceable and prevents UI or 3D code from inventing physical facts.

## Inputs

### VehicleCargoSpace

```js
{
  id,
  name,
  interiorDimensionsM: { width, depth, height },
  doorDimensionsM: { width, height },
  maxPayloadKg,
  obstructions,
}
```

### PackingItem

Each item explicitly selects one `FurnitureAsset` physical state:

```js
{
  id,
  furnitureAssetId,
  physicalStateId,
  dimensionsM,
  weightKg,
  allowedOrientations,
  stackable,
  maxSupportedWeightKg,
  fragile,
  loadSequencePriority,
}
```

### PackingRequest

The request combines one vehicle, selected items, and optimization objectives such as payload balance, volume utilization, vehicle count, and load order.

## Preflight

Before a solver runs, readiness checks must report:

- missing vehicle dimensions or payload;
- missing item dimensions, weight, or orientations;
- aggregate payload violations;
- an empty move selection.

Future checks will add door clearance, indivisible assemblies, support surfaces, fragility, and access paths.

## Output

`PackingPlan` records status, placements, unplaced items, metrics, and explanations. A solver may return several plans with different trade-offs. An `INFEASIBLE` result is valid and must explain hard constraints instead of forcing a layout.

## Initial Solver Boundary

The first solver should use rectangular proxies with discrete orientations and heuristic search. It should optimize for useful feasible plans, not claim global optimality. Realistic 3D furniture models remain presentation assets until an irregular-geometry solver is introduced.
