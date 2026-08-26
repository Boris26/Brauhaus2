# Recipe Import V2 – UI audit and migration

## Ist/Soll comparison

| Component | Previous UI behavior | Recipe Import V2 contract | UI change |
|---|---|---|---|
| `BeerForm` / connector | Opened the import dialog, immediately closed it after dispatch and later copied `importedBeer` into the editor. | A successful result wraps the persisted beer in `result.recipe`; validation failures must leave the dialog open. | The dialog stays open during/following a failed request and closes when a new imported beer arrives. Existing defensive normalization is retained after the backend response. Import loading, errors and result metadata are connected from Redux. |
| Import dialog / file input | Called the selection a “Quelle”, offered MMuM, BRAUREKA and Brauhaus, parsed only on submit, and always enabled submit. | The user selects the parser **format** (`BRAUHAUS` or `MMUM`); source JSON is passed without domain mapping. BRAUREKA is not operational. | Compact format/file dialog; `.json,application/json`; parse on selection; object root check; submit enabled only for supported format plus valid JSON; friendly syntax errors; BRAUREKA absent; loading prevents duplicate requests. |
| `BeerActions` | Dispatched a typed `{source, recipe}` request; `ADD_IMPORTED_BEER` carried a naked `Beer`. | Request is `{format, recipe, idempotencyKey}` and response is `RecipeImportResult`, including `replayed`. | Action carries `RecipeImportRequest`; success carries the complete result and failure carries a user-safe message. |
| Beer reducer | Added the naked response to `beers` and set `importedBeer`; no import status/metadata. | `result.recipe` remains the editor/list recipe while warnings/mappings/created data remain accessible. | Stores loading, error and complete result; adds only `result.recipe` to existing beer state. |
| Import epic | Called the repository and treated its response as `Beer`; errors opened the global dialog with loosely inspected error data. | Repository returns a typed result; failures may be `{error:{code,message,path}}`. | Dispatches the typed result; structured messages include the affected field path and keep the import dialog open. No retry operator exists. |
| `BeerRepository` / `BaseRepository` | The current branch already posted `{source, recipe}` as JSON, although the unused historical `postFile` multipart helper remained. | `POST /api/database/importbeer`, JSON `{format, recipe, idempotencyKey?}`, returns `RecipeImportResult`. | Posts the typed V2 request/result through existing `BaseRepository.post` with an explicit JSON content type; removed unreferenced `postFile`. |
| Notifications | Save info existed, but import warnings/mappings/created data were discarded. | Successful imports may contain non-fatal metadata. | The recipe form shows warning messages, ALIAS/FUZZY/CREATED mapping names, and newly created ingredient names. Exact mappings are not highlighted. |

## Contract and responsibility

The final UI path is dialog → `File.text()` → `JSON.parse()` → `RecipeImportRequest` → Redux → epic → repository → JSON `POST importbeer` → `RecipeImportResult`. The parsed object is handed over unchanged: no ingredient, mash, fermentation, quantity, unit, or format conversion runs before import. File names are display-only.

The model defines `RecipeImportFormat`, `RecipeImportRequest`, `RecipeImportResult` including `replayed`, warning, exact ingredient-mapping, created-master-data, and structured-error types. `BRAUREKA` remains represented in the enum for contract evolution but is deliberately absent from the productive selector.

General recipe normalizers (`normalizeMashPlan`, `normalizeFermentationStep`, `numberMashSteps`, `normalizeHopDto`, and additional-ingredient normalization) remain in place. They still protect loaded, edited, and persisted `Beer` data and only run after a successful backend import.

## Compatibility, idempotency, and versioning

This UI version requires BeerDatabase 2.x and its Recipe Import V2 JSON endpoint. It is incompatible with the legacy multipart import endpoint; there is no fallback. No package-version bump was made because releases derive their displayed version from CI tags/build metadata and the repository contains no instruction to bump SemVer for an individual feature.

The UI generates a UUID when a valid source file is prepared and generates a new UUID when the file or selected format changes. Re-sending the already prepared request retains its key; the repository never creates keys. A replay is successful and replaces an existing recipe with the same persistent ID instead of duplicating it. There is no automatic HTTP retry in the import epic.

The Flask blueprint owns `/importbeer`. The browser calls `/api/database/importbeer` because the shared Axios instance has `baseURL: /api/database`; the development proxy forwards `/api/*` unchanged, and deployment routing removes/routes the external prefix. No endpoint change is required.

**Needs verification:** the BeerDatabase source repository is not present in this workspace, so its implementation could not be independently inspected here. The UI types and behavior use the final BeerDatabase 2.x request, response, mapping, error, status, and idempotency contract supplied for this migration.
