# MYROOMIE Final V1 Status

| Area | Status | Notes |
|---|---|---|
| Room / Floorplan / Furniture | Ready | V0 RoomDocument, placement, collision and out-of-bounds behavior preserved |
| Wishlist and Intake | Ready | Purchase advice never changes lifecycle; only the user-facing 已购买 action does |
| Move Decision rules | Ready | Deterministic rules run first and do not call the Agent when resolved |
| Purchase Decision rules | Ready | Missing facts remain null; deterministic paths do not call the Agent |
| Live Agent | Ready when local `.env` is present | Move and Purchase share `/api/decision/agent-reason`; validated output only |
| Local fallback | Ready | Provider failure is contained and does not crash the UI |
| Gesture Production V0 | Ready | Default off; explicit camera permission; mouse fallback remains available |
| Gesture offline use | Partial | MediaPipe WASM and model resources use external HTTPS assets |
| Generated 3D | Pending | `PENDING_GENERATION` presentation only; Image-to-3D is not implemented |
