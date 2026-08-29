# Test Fix V0.2.1

The demo room baseline is 3.2 m × 5.0 m × 2.7 m. The prior V0.2 spatial-constraint contract test still contained hard-coded coordinates from the older, wider demo room. That made the first move assertion expect x=3 while the 3.2 m room correctly rejected the out-of-bounds candidate and kept x=1.5.

V0.2.1 changes only the test fixture coordinates used by `tests/spatialConstraintV0.contract.test.mjs` so the same collision policies are tested inside the confirmed 3.2 m × 5.0 m demo room. Product/runtime collision logic is unchanged.

Validated contract suites:
- furnitureRepresentationV0.contract.test.mjs — pass
- spatialAnalyzerV0.contract.test.mjs — pass
- spatialConstraintV0.contract.test.mjs — pass

Generated route remains reserved/pending and is not removed.
