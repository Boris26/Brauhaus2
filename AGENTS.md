# Project rules for Codex

- Do not change application code unless explicitly asked.
- Before code changes, read the relevant durable context docs in `docs/codex/`:
  - `app-context.md` for React architecture, state, routing, build, and tests.
  - `system-overview.md` for UI/backend/control responsibilities.
  - `dependencies.md` for libraries, URLs, scripts, and deployment assumptions.
  - `data-flow.md`, `interfaces.md`, and `domain-model.md` for data contracts.
  - `coding-rules.md` and `known-risks.md` before refactors.
- For backend or PI-control coordination, read `docs/codex/exports/` and do not invent behavior; mark unclear items as `Needs verification`.

# Codex Instructions

Before changing code, read the relevant files under `docs/codex/`.

Always read:

- `docs/codex/app-context.md`
- `docs/codex/interfaces.md`
- `docs/codex/domain-model.md`
- `docs/codex/data-flow.md`
- `docs/codex/coding-rules.md`
- `docs/codex/known-risks.md`
- `docs/codex/external/database-context.md`
- `docs/codex/external/control-context.md`
- `docs/codex/compatibility/cross-repo-contracts.md`
- `docs/codex/compatibility/compatibility-checklist.md`

This UI consumes data and APIs from the database/backend and the PI control app.

Before changing UI behavior that depends on backend/control data, check compatibility for:

- API paths and methods,
- DTOs and response fields,
- IDs,
- recipe fields,
- finished-brew fields,
- ingredient fields,
- generated control status fields,
- timing units,
- temperature units,
- water status,
- polling and terminal states,
- enum/string values.

If a change affects another repository, document the compatibility impact and update the related Codex context file.

Do not silently break cross-repo contracts.
