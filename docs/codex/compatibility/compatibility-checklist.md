# Compatibility checklist

Use this checklist before changing code.

## Always check

- Does the change rename a field?
- Does the change remove a field?
- Does the change change a field type?
- Does the change change a unit, for example seconds/minutes, Celsius, liters, percentage, Plato, IBU, EBC?
- Does the change change enum/string values?
- Does the change change HTTP method, path, status code, or response body?
- Does the change change default values?
- Does the change change list ordering?
- Does the change change ID generation or ID stability?
- Does the change change polling behavior or terminal states?
- Does the change change error response shape?
- Does the change change startup/initial empty values?

## Required Codex behavior

When a compatibility-relevant change is requested, Codex must:

1. read `docs/codex/compatibility/cross-repo-contracts.md`,
2. read matching files under `docs/codex/external/`,
3. mention which contract is affected,
4. avoid breaking changes unless explicitly requested,
5. update Codex docs together with the code change,
6. write `Needs verification` for behavior that cannot be verified in the current repo.

## Never assume

- Do not assume another repository can tolerate renamed fields.
- Do not assume a UI-visible enum can be changed safely.
- Do not assume clients ignore unknown or missing fields.
- Do not assume HTTP trailing slash changes are harmless.
- Do not assume startup empty values are unused.
