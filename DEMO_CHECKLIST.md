# Final V1 Competition Checklist

- [ ] Confirm V0 remains available as emergency fallback.
- [ ] Start V1 and visit `/`, `/floorplan`, `/room`, and `/furniture`.
- [ ] Confirm desk, office chair, Intake, Wishlist, editing, collision, out-of-bounds and Purchased transition.
- [ ] Move Decision: show one rules-only result, then one genuine tradeoff if Live Agent is available.
- [ ] Purchase Decision: show one rules-only result with zero Agent requests.
- [ ] Confirm Purchase BUY is advice only and does not mark the item purchased.
- [ ] Confirm Move and Purchase use the same `/api/decision/agent-reason` provider boundary.
- [ ] Confirm provider failure displays a safe message and the rest of the demo remains usable.
- [ ] Gesture starts OFF; mouse interaction works before camera permission.
- [ ] Enable Gesture explicitly and verify permission denial keeps mouse fallback working.
- [ ] If camera/network are available, verify Select, Move X/Z, Rotate Y, Orbit, and Deselect.
- [ ] Present Generated as `3D 模型待生成`; do not claim Image-to-3D is implemented.
- [ ] Stop V1 using `STOP_MYROOMIE_DEMO.bat`.
