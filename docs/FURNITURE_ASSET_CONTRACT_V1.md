# FurnitureAsset Contract V1

## Purpose

`FurnitureAsset` is the long-lived digital record of one real or prospective furniture item. It separates verified physical facts from room placement and visual representation. The first implementation lives in `src/domain/furnitureAsset.js` and is additive to the current `Furniture` schema.

## Contract Shape

```js
{
  schemaVersion: 1,
  id,
  name,
  identity: { brand, model, sku, productUrl },
  semantic: { category, archetype },
  capabilities: { foldable, disassemblable, modular },
  defaultPhysicalStateId,
  physicalStates: [{
    id,
    kind: 'ASSEMBLED' | 'FOLDED' | 'DISASSEMBLED',
    dimensionsM: { width, depth, height },
    volumeM3,
    weightKg,
    handling: {
      allowedOrientations,
      stackable,
      maxSupportedWeightKg,
      fragile,
      requiresPeople,
      requiredTools,
    },
    provenance: {
      dimensions: FactProvenance,
      weight: FactProvenance,
      handling: FactProvenance,
    },
  }],
}
```

`FactProvenance` records:

```js
{
  source: 'USER_MEASURED' | 'MANUFACTURER_SPEC' | 'AI_ESTIMATED' | 'IMPORTED' | 'UNKNOWN',
  verificationStatus: 'UNVERIFIED' | 'USER_CONFIRMED' | 'SOURCE_VERIFIED',
  confidence,
  reference,
  capturedAt,
}
```

## Invariants

- Dimensions use metres and weight uses kilograms.
- Volume is derived from dimensions and is never an independent source of truth.
- Each physical state owns its dimensions and handling constraints.
- Visual-model bounds may calibrate rendering but cannot overwrite physical facts.
- Placement remains outside the asset.
- Unknown facts remain `null`; the system must not invent packing values.
- AI-estimated facts remain unverified until confirmed by a user or authoritative source.

## Readiness

The contract exposes three progressively stricter readiness signals:

- Spatial planning requires width, depth, and height.
- Payload planning additionally requires weight.
- Packing optimization additionally requires at least one allowed orientation.

Readiness and verification are separate. A complete but unverified record may support a preview, while the UI should still disclose uncertainty before a real moving decision.

## Migration

`createFurnitureAssetFromFurniture` converts an existing `Furniture` record into one assembled physical state. It preserves known dimensions and weight, marks their source as `IMPORTED`, and leaves them unverified. It never fabricates folding dimensions or handling constraints.

The current `Furniture` schema remains supported until persistence and UI migration are designed and tested.
