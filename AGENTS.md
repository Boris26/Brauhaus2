# Project rules for Codex

- Do not change application code unless explicitly asked.
- Before code changes, read the relevant durable context docs in `docs/codex/`:
  - `app-context.md` for React architecture, state, routing, build, and tests.
  - `system-overview.md` for UI/backend/control responsibilities.
  - `dependencies.md` for libraries, URLs, scripts, and deployment assumptions.
  - `data-flow.md`, `interfaces.md`, and `domain-model.md` for data contracts.
  - `coding-rules.md` and `known-risks.md` before refactors.
- For backend or PI-control coordination, read `docs/codex/exports/` and do not invent behavior; mark unclear items as `Needs verification`.
