# Final V1 Demo Route

1. Start with `START_MYROOMIE_DEMO.bat`; production frontend opens on `http://127.0.0.1:4180/`.
2. `/floorplan`: verify the shared 2D RoomDocument.
3. `/room`: verify Room, desk, office chair, collision/out-of-bounds, Move Decision, and optional Gesture controls.
4. `/furniture`: add owned and wishlist furniture, edit details, trial-place, and run Purchase Decision.
5. Show a deterministic Decision result first; use a real tradeoff only when demonstrating the single Live Agent boundary.
6. Use 已购买 explicitly to demonstrate `NONE + WISHLIST → USER + OWNED`; a BUY recommendation never performs this action.
7. Stop only V1 services with `STOP_MYROOMIE_DEMO.bat`.

Backend: `http://127.0.0.1:8787/` (API endpoint: `POST /api/decision/agent-reason`).
