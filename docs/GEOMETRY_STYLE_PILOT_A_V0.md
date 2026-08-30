# MYROOMIE Cozy Geometry Pilot A — Demo V0

## Status

**DEMO ACCEPTED**

Pilot: **OFFICE_CHAIR**

Input: existing Library `office-chair.glb`

Output: `office-chair-cozy-v0.glb`

## Validated

- Blender 5.2.1 workflow can import and export the real Office Chair GLB.
- Smooth shading is repeatable and visual-only.
- Limited decimation is applied only to high-density meshes (Pilot threshold: over 20,000 polygons, ratio 0.68).
- The web runtime can switch the same Office Chair between original and candidate VisualModel assets.
- Furniture physical dimensions remain unchanged.
- GeometryProxy remains unchanged.
- Placement and rotation remain unchanged.
- Collision and out-of-bounds contracts remain unchanged.

## Not validated

- Universal Library geometry automation
- Caster semantic automation
- Armrest semantic automation
- Support thickening automation
- Sofa Geometry
- Floor Lamp Geometry
- Generated Geometry

## Deferred

Pilot B is deferred. The current result is sufficient for the hackathon demo; further geometry refinement has lower priority than completing the core Decision experience.

The Blender script is an Office Chair Geometry Style Pilot Script V0, not a universal furniture geometry converter.
