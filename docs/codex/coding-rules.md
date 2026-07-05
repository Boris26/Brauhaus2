# Coding rules for future Codex sessions

## Repository-specific rules

- Read the relevant `docs/codex/` context before changing application code.
- Do not invent backend or PI/control behavior; mark unclear items as `Needs verification`.
- Preserve endpoint methods and paths unless a coordinated backend/control contract change is explicitly requested.
- Keep brewing-status UI decisions in `src/utils/brewingStatus/selectors.ts`; avoid re-coupling components directly to legacy `StatusText`-style fields.
- Keep compatibility mapping in `normalizeBrewingStatus` if backend status evolves.
- Keep `executionMode` semantics in production recipe mapping: `CONFIRMATION_HOLD` is explicit; `time=0` is not a replacement for confirmation hold.
- Do not add try/catch around imports.

## Testing expectations

For code changes, run targeted tests relevant to touched files. Common commands:

- `npm test -- --watchAll=false`
- `npm run build`

Needs verification: full build/test health may depend on dependency versions and the local environment.

## Documentation expectations

If changing API clients, DTOs, status selectors, polling, localStorage use, URL config, build/deploy scripts, or major UI flows, update the matching files under `docs/codex/` and, if the change affects backend/control developers, update `docs/codex/exports/`.

