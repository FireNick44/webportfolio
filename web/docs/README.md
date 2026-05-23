# Project docs

Architecture notes for the interactive, game-style pieces of the portfolio —
written as we build them, so the moving parts and how they fit together stay
documented.

- **[Underwater Outro ("Reef")](./underwater-outro.md)** — the animated seabed at
  the bottom of every page: layered sprites, procedural bubbles, swaying
  kelp/coral, the cursor-aware octopus, and the shared graphics-tier system.
- **[Flask Rack](./flask-rack.md)** — the Matter.js physics flasks in the Skills
  section: seeded layout, depth/skeleton model, per-tier + mobile presets, and
  the scene/engine mechanics.

Both surfaces share one quality setting (`useGraphicsTier`) so a single Settings
control scales the whole page from `off` → `high`.
