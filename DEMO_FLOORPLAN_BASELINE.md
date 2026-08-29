# Demo Floorplan Baseline V0.2

Confirmed presentation baseline from the user-supplied floor-plan image.

## Fixed demo facts

- Net room width: **3.2 m**
- Net room depth: **5.0 m**
- Wall height: **2.7 m**
- Interior partition walls: **none in the presentation room**
- Main window: **centered on the top / north wall**
- Entry door: **on the bottom / south wall, toward the right side**

The reference image is stored at `docs/demo-floorplan-reference.jpg`.

## Approximate opening values used in V0.2

The source drawing does not label exact door/window widths or exact offsets, so V0.2 uses presentation-safe approximations rather than claiming measured values:

- Door width: **0.8 m**
- Door center: **0.65 m from the right-hand start point of the south wall**
- Window width: **1.0 m**
- Window center: **centered at 1.6 m on the 3.2 m north wall**
- Window sill: **0.75 m**
- Window height: **1.45 m**

If measured door/window dimensions become available later, only the opening metadata should be updated. The 3.2 × 5.0 × 2.7 room baseline should remain unchanged unless the demo brief changes.

## Collision policy

Interior-wall collision support is retained in `SpatialAnalyzer`, but test-only partition walls are created inside contract tests. Test geometry must not be injected into the presentation `INITIAL_ROOM_DOCUMENT`.
