# Cross-repository contracts

## Purpose

These rules tell Codex when a change in one repository may break another repository.

Codex must check this file before changing API-facing, UI-visible, database-facing, or generated control data.

## UI ↔ Database/backend

The React UI consumes database/backend data for:

- beer recipes,
- finished brews,
- ingredient master data,
- imported recipe data.

The database/backend owns:

- persistent IDs,
- stored recipe fields,
- finished-brew records,
- ingredient master data,
- response shapes,
- database defaults and derived values.

Before changing any database/backend field or endpoint, check whether the UI uses it for:

- table display,
- selection,
- deletion,
- finished-brew linkage,
- recipe-to-control mapping,
- ingredient forms,
- production start,
- PDF/export/shopping-list behavior.

### High-risk UI/database fields

- `Beer.id`
- `Beer.name`
- `Beer.type`
- `Beer.color`
- `Beer.alcohol`
- `Beer.cookingTime`
- `Beer.cookingTemperatur`
- `Beer.fermentation` / `fermentationSteps`
- `Beer.fermentation[].type`
- `Beer.fermentation[].temperature`
- `Beer.fermentation[].time`
- `Beer.fermentation[].executionMode`
- `Beer.wortBoiling.hops[].name`
- `Beer.wortBoiling.hops[].time`
- `FinishedBrew.id`
- `FinishedBrew.beer_id`
- `FinishedBrew.name`
- `FinishedBrew.state`
- `FinishedBrew.brewValues`
- `FinishedBrew.startDate`
- `FinishedBrew.endDate`

## UI ↔ PI control

The PI control app produces runtime/control data that the UI displays and uses for workflow behavior.

Before changing control output, check whether the UI uses it for:

- status labels,
- production polling,
- countdown/progress,
- hop reminders,
- waiting/confirmation dialogs,
- heater/flame display,
- agitator display,
- water fill display,
- online/offline state.

### High-risk UI/control fields

- `process.state`
- `currentStep.index`
- `currentStep.count`
- `currentStep.phase`
- `currentStep.mode`
- `currentStep.name`
- `currentStep.duration`
- `currentStep.elapsedTime`
- `currentStep.remainingTime`
- `currentTime`
- `elapsedTime`
- `temperature.current`
- `temperature.target`
- `temperature.sensorHealth`
- `temperature.sensorId`
- `hardware.heater`
- `hardware.agitator`
- `waiting.waitingFor`
- `waiting.canConfirm`
- `error.code`
- `error.details`
- `WaterStatus.liters`
- `WaterStatus.openClose`

## Known compatibility conflicts

### Finished beer update

- UI currently documents/calls update through `POST finishedbeer`.
- Database documentation says update is `PUT /finishedbeer`.

Until this is resolved, do not change finished-brew update behavior without checking both repositories.

### Control availability endpoint

- UI expects `GET /Available/`.
- PI control API now confirms `/Available/` as the UI-facing availability endpoint.

Do not remove or rename availability checks without a coordinated UI/control change.

### Status `currentTime`

- PI control documentation says `currentTime` is a Unix timestamp during active updates and may be `0`.
- UI code must not use `currentTime` as elapsed duration, countdown, or progress denominator.

Use `elapsedTime`, `currentStep.duration`, and `currentStep.remainingTime` for process timing UI unless a new explicit API field is agreed.

### `WaterStatus`

- UI expects `{ liters, openClose }`.
- PI control API now guarantees an object shape from startup and supports both `/WaterStatus` and `/WaterStatus/`.

UI should still keep defensive handling for null, undefined, or failed HTTP responses.

### Beer recipe create/update

- New beer recipes are created with `POST /beer`; the request body must not include `id`.
- Existing beer recipes are updated with `PUT /beer/{id}`; the path id is authoritative and body id, when present, must match it.
- Create/update responses may include only `{ id, message, beer: { id } }`; the UI must preserve its current form data and merge the returned id instead of requiring a full `Beer`.
- Unknown update ids return `404 BEER_NOT_FOUND` and must not trigger an automatic POST fallback.

## Compatibility rule

If a changed field, endpoint, enum, unit, or response shape is listed in this file or in `docs/codex/external/`, Codex must:

1. identify the affected repository,
2. explain the compatibility impact,
3. preserve backward compatibility where possible,
4. update the related Codex documentation,
5. mark unresolved cross-repo work as `Needs verification`.

### Final UI ↔ PI control contract

The final confirmed contract is documented in `docs/codex/compatibility/final-ui-control-compatibility-report.md`. Future changes must preserve: `GET /Available/` as the UI-facing availability route, `GET /` as an existing PI route, both `GET /WaterStatus` and `GET /WaterStatus/`, object-shaped WaterStatus defaults, no-value `TurnOn`/`TurnOff`, preserved value-bearing command aliases, concrete-only confirmations, rejection of `/Confirm/Wait`, and `currentTime` as a Unix timestamp rather than a UI duration/progress field.

### Control Web Push endpoints

The React PWA now expects the PI/control service to expose Web-Push management below the existing controller base URL `/api/controller`:

- `GET /push/public-key` returns `{ "publicKey": "<VAPID_PUBLIC_KEY>" }`.
- `POST /push/subscriptions` stores a browser `PushSubscription` idempotently.
- `DELETE /push/subscriptions` removes a subscription by `{ "endpoint": "..." }`.
- `POST /push/test` sends a test notification to registered subscriptions.

Push notifications are triggered by the control service when `waiting.canConfirm` becomes true for confirmation states such as `MASHING_IN_CONFIRMATION`, `IODINE_TEST`, `MASHING_OUT_CONFIRMATION`, `COOKING_CONFIRMATION`, `BOILING_CONFIRMATION`, or `DECOCTION_CONFIRMATION`. This repository only implements the UI/service-worker side; backend persistence and status-transition detection remain **Needs verification** in the PI/control repository.
